import loaderUtils from 'loader-utils';
import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';
import objHash from 'object-hash';

import defaultOptions from './defaultOptions';
import deriveQualityOptions from './lib/deriveExportOptions';
import { ensureCacheReady } from './lib/cache';
import createBasisFile from './lib/createBasisFile';
import createImageFile from './lib/createImageFile';
import generateDeclarations from './lib/generateDeclarations';
import getDefaultQuality from './lib/getDefaultQuality';
import resize from './lib/resize';


interface QueryParams {
	mode?: string;
	quality?: string;
}

let generatedDeclarations = false;

export default async function load( source: string ): Promise<string> {
	if ( this.cacheable ) this.cacheable();

	const { resource } = this;
	const options = { ...defaultOptions, ...( loaderUtils.getOptions( this ) || {}) };
	const context = options.context || this.rootContext;
	const params = this.resourceQuery
		? loaderUtils.parseQuery( this.resourceQuery ) as QueryParams
		: {};

	const relativePath = this.resourcePath
		.replace( this.rootContext, '' )
		.split( path.sep )
		.join( path.posix.sep );

	if (
		!generatedDeclarations
		&& options.generateDeclarations
		&& process.env.NODE_ENV !== 'production'
	) {
		generateDeclarations( options );
		generatedDeclarations = true;
	}


	let mode = 'default';

	if ( params.mode ) {
		if ( params.mode in options.modes ) {
			mode = params.mode;
		} else {
			this.emitWarning( `Mode '${params.mode}' does not exist.` );
		}
	} else {
		Object.entries( options.modes ).forEach( ([modeId, { test }]) => {
			if ( typeof test === 'function' ) {
				if ( test( relativePath, this.resourcePath ) ) mode = modeId;
			}
		});
	}


	let quality = getDefaultQuality( options, mode );

	if ( params.quality ) {
		if ( params.quality in options.qualityLevels ) {
			quality = params.quality;
		} else {
			this.emitWarning( `Quality '${params.quality}' does not exist.` );
		}
	}


	const exportOptions = deriveQualityOptions({
		options,
		mode,
		quality,
	});


	const interpolatedName = loaderUtils.interpolateName( this, options.name, {
		context,
		content: source,
	});
	const outputPath = ( 'outputPath' in options )
		? path.join( options.outputPath, interpolatedName )
		: interpolatedName;


	const temp = outputPath.split( '.' );
	const fileExt = temp.pop().toLowerCase();
	const isResizable = fileExt.match( /jpe?g|png|webp/ );

	await ensureCacheReady();

	const sourceFileStats = await sharp( this.resourcePath ).metadata();
	const sourceFileBuffer = await fs.readFile( this.resourcePath );
	const sourceFileHash = loaderUtils.getHashDigest( sourceFileBuffer, 'md4', 'hex', 32 );


	const exportSizes: Record<string, {
		width: number;
		height: number;
		fileName: string;
		files: { ext: string; name: string }[];
	}> = {};

	await Promise.all(
		Object.entries( exportOptions.sizes )
			.map( async ([sizeId, sizeOpts]) => {
				const fileName = `${
					temp.join( '.' )
				}-${
					objHash({
						...exportOptions,
						// override the size list with the relevant size settings
						// to only hash options used for the current rendition
						sizes: sizeOpts,
					}).substr( 0, options.optionHashLength )
				}`;

				let inputBuffer = sourceFileBuffer;
				let inputPath = this.resourcePath;
				let { width, height } = sourceFileStats;


				if ( isResizable ) {
					const resized = await resize({
						width,
						height,
						inputHash: sourceFileHash,
						inputBuffer: sourceFileBuffer,
						reportName: relativePath,
						options: exportOptions,
						sizeOpts,
						resource,
					});

					if ( resized ) {
						inputBuffer = resized.buffer;
						inputPath = resized.path;
						width = resized.width;
						height = resized.height;
					} else if ( sizeId !== 'default' ) {
						// no resize needed,
						// use the original
						return;
					}
				} else if ( sizeId !== 'default' ) {
					// svgs and gifs won't get properly resized,
					// use the original
					return;
				}

				const files = [];
				const inputHash = loaderUtils.getHashDigest( inputBuffer, 'md4', 'hex', 32 );

				if ( exportOptions.emitBasis ) {
					if ( fileExt.match( /png|jpe?g/ ) ) {
						const basis = await createBasisFile({
							inputHash,
							inputPath,
							options: exportOptions.basis,
							reportName: relativePath,
							resource,
						});

						this.emitFile( `${fileName}.basis`, basis.buffer );
						files.push({ ext: 'basis', name: 'basis' });
					} else {
						this.emitWarning(
							new Error(
								`Basis compression is not available for ${
									fileExt
								} files. Only jpg and png are supported.`,
							),
						);
					}
				}

				if ( exportOptions.emitWebp ) {
					const webp = await createImageFile({
						inputHash,
						resource,
						type: 'webp',
						buffer: inputBuffer,
						options: exportOptions,
						reportName: relativePath,
					});

					this.emitFile( `${fileName}.webp`, webp.buffer );
					files.push({ ext: 'webp', name: 'webp' });
				}

				if ( exportOptions.skipCompression ) {
					this.emitFile( `${fileName}.${fileExt}`, inputBuffer );
					files.push({ ext: fileExt, name: 'src' });
				} else if ( fileExt.match( /jpe?g|png|gif|svg/g ) ) {
					const outExt = fileExt.replace( 'jpeg', 'jpg' );

					const image = await createImageFile({
						inputHash,
						resource,
						type: outExt,
						buffer: inputBuffer,
						options: exportOptions,
						reportName: relativePath,
					});

					this.emitFile( `${fileName}.${outExt}`, image.buffer );
					files.push({ ext: outExt, name: 'src' });
				} else {
					this.emitWarning(
						new Error(
							`${
								fileExt
							} files are currently not supported, the file will not be compressed.`,
						),
					);

					this.emitFile( `${fileName}.${fileExt}`, inputBuffer );
					files.push({ ext: fileExt, name: 'src' });
				}

				exportSizes[sizeId] = {
					width,
					height,
					fileName,
					files,
				};
			}),
	);


	const exportMeta: { name: string; value: string | number | boolean }[] = [];

	exportMeta.push(
		{ name: 'alpha', value: sourceFileStats.hasAlpha },
	);

	if ( exportOptions.thumbnail ) {
		const thumb = sharp( sourceFileBuffer ).resize(
			exportOptions.thumbnail.width,
			exportOptions.thumbnail.height,
			{ fit: 'fill' },
		);

		exportMeta.push({
			name: 'thumbnail',
			value: JSON.stringify({
				data: exportOptions.thumbnail.format === 'png'
					? `data:image/png;base64,${
						( await thumb.png().toBuffer() ).toString( 'base64' )
					}`
					: ( await thumb.ensureAlpha().raw().toBuffer() ).toString( 'base64' ),
				width: exportOptions.thumbnail.width,
				height: exportOptions.thumbnail.height,
			}),
		});
	}


	const exportPaths = new Map(
		Object.values( exportSizes ).map( ({ fileName }, i ) => [fileName, `p${i}`]),
	);

	let paths = '';
	exportPaths.forEach( ( varName, fileName ) => {
		paths += `const ${varName} = __webpack_public_path__ + ${JSON.stringify( fileName )};\n`;
	});


	const sizeToExportString = ( key: string ) => {
		const {
			files, fileName, width, height,
		} = exportSizes[key];
		return (
			files
				.map( ({ ext, name }) => (
					`${name}: ${exportPaths.get( fileName )} + '.${ext}'`
				) )
				.concat([
					`width: ${width}`,
					`height: ${height}`,
				])
				.join( ',' )
		);
	};

	return `
${
	// export path variable definitions
	paths
}
module.exports = {
	prefix: __webpack_public_path__,
${
	// export meta info on root level
	exportMeta.map( ({ name, value }) => (
		`${name}: ${value}`
	) ).join( ',' )

},
${
	// export default size on root level
	sizeToExportString( 'default' )

},
	sizes: {
${
	// export all remaining sizes
	Object.keys( exportOptions.sizes )
		.filter( key => key !== 'default' )
		.map( ( key ) => (
			// if there are no files for the current size,
			// reuse the default ones
			`${key}: {
				${sizeToExportString( key in exportSizes ? key : 'default' )}
			}`

		) ).join( ',' )
}
	}
};
`;
}
