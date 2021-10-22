import loaderUtils from 'loader-utils';
import sharp from 'sharp';
import path from 'path';
import objHash from 'object-hash';

import { ensureCacheReady } from '@bsmth/loader-cache';
import defaultOptions from './defaultOptions';
import generateDeclarations from './lib/generateDeclarations';
import deriveExportOptions from './lib/deriveExportOptions';
import deriveOutputFilename from './lib/deriveOutputFilename';
import getDefaultQuality from './lib/getDefaultQuality';
import createBasisFile from './lib/createBasisFile';
import createImageFile from './lib/createImageFile';
import resize from './lib/resize';
import getSize from './lib/getSize';


interface QueryParams {
	mode?: string;
	quality?: string;
}

let generatedDeclarations = false;

export default async function load( source: Buffer ): Promise<string> {
	// signal webpack that the loader results are deterministic
	if ( this.cacheable ) this.cacheable();

	// ensure that the file cache is ready
	// and the cache plugin is running
	await ensureCacheReady();


	// WEBPACK SPECIFICS

	const {
		resource,
		resourceQuery,
		rootContext,
		resourcePath,
	} = this;

	const options = { ...defaultOptions, ...( loaderUtils.getOptions( this ) || {}) };

	const params = resourceQuery
		? loaderUtils.parseQuery( resourceQuery ) as QueryParams
		: {};


	// IMPORT AND EXPORT FILENAME DERIVATION

	const relativePath = resourcePath
		.replace( rootContext, '' )
		.split( path.sep )
		.join( path.posix.sep );

	const {
		fileExt,
		fileNameBase,
	} = deriveOutputFilename({
		options,
		source,
		loaderContext: this,
	});


	// SOURCE FILE CONTENT AND META

	const sourceFileBuffer = source;
	const sourceFileHash = loaderUtils.getHashDigest( sourceFileBuffer, 'md4', 'hex', 32 );
	const {
		width: sourceWidth,
		height: sourceHeight,
	} = await sharp( resourcePath ).metadata();
	const {
		isOpaque: sourceIsOpaque,
	} = await sharp( resourcePath ).stats();


	// TYPESCRIPT DECLARATIONS

	if (
		!generatedDeclarations
		&& options.generateDeclarations
		&& process.env.NODE_ENV !== 'production'
	) {
		generateDeclarations( options );
		generatedDeclarations = true;
	}


	// MODE DETECTION

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
				if ( test( relativePath, resourcePath ) ) mode = modeId;
			}
		});
	}


	// QUALITY LEVEL DETECTION

	let quality = getDefaultQuality( options, mode );

	if ( params.quality ) {
		if ( params.quality in options.qualityLevels ) {
			quality = params.quality;
		} else {
			this.emitWarning( `Quality '${params.quality}' does not exist.` );
		}
	}


	// FINAL EXPORT OPTIONS

	const exportOptions = deriveExportOptions({
		options,
		mode,
		quality,
	});


	// RESOLUTIONS DERIVATION

	// every resolution only needs to be generated once
	// storing them as strings in a Set ensures that.
	// using strings here is a dumb way of making the Set work as expected
	const resolutionIds = new Set<string>();

	// map the sizeId to the corresponding resolution identifier
	const resolutionMap = new Map<string, string>();

	// gifs and svgs cannot be resized
	const isResizable = fileExt.match( /jpe?g|png|webp/ );

	// derive final resolutions for the desired sizes
	Object.entries( exportOptions.sizes ).forEach( ([sizeId, sizeOpts]) => {
		const resIdentifier = isResizable
			// calculate the new resolution if the source is resizable
			? getSize({
				sizeOpts,
				width: sourceWidth,
				height: sourceHeight,
				options: exportOptions,
			}).toString()
			// otherwise use the source one
			: `${sourceWidth},${sourceHeight}`;

		// map the sizeId to the resolution identifier
		resolutionMap.set(
			sizeId,
			resIdentifier,
		);

		// and add the resolution identifier to the set of
		// resolutions that need to be generated
		resolutionIds.add( resIdentifier );
	});


	// RESOLUTIONS GENERATION

	const resolutions = new Map<string, {
		width: number;
		height: number;
		fileName: string;
		varName: string;
		files: { ext: string; name: string }[];
	}>();

	// generate files for all resolutions
	await Promise.all( Array.from( resolutionIds ).map( async ( resIdentifier, i ) => {
		// resolutions are stored as strings inside the resolutionIds Set (see above)
		const [width, height] = resIdentifier.split( ',' ).map( x => parseInt( x, 10 ) );

		// the export filename consists of the user specified filename
		// and an option hash to differentiate between renditions
		const fileName = `${fileNameBase}-${
			objHash({
				...exportOptions,
				// override the size list with the final resolution
				// to only hash options used for the current rendition
				sizes: resIdentifier,
			}).substr( 0, options.optionHashLength )
		}`;

		let inputBuffer = sourceFileBuffer;
		let inputPath = resourcePath;

		if ( width !== sourceWidth || height !== sourceHeight ) {
			// input needs to be resized.
			const resized = await resize({
				width,
				height,
				inputBuffer,
				resource,
				inputHash: sourceFileHash,
				reportName: relativePath,
				options: exportOptions,
			});

			// use the resized version as input
			inputBuffer = resized.buffer;
			inputPath = resized.path;
		}

		const files = [];

		// common options for all create functions
		const createOptions = {
			resource,
			inputPath,
			options: exportOptions,
			reportName: relativePath,
			buffer: inputBuffer,
			inputHash: loaderUtils.getHashDigest( inputBuffer, 'md4', 'hex', 32 ),
		};


		// SOURCE FILE COMPRESSION

		if ( exportOptions.skipCompression ) {
			// input should not be compressed,
			// emit file unaltered.

			this.emitFile( `${fileName}.${fileExt}`, inputBuffer );
			files.push({ ext: fileExt, name: 'src' });
		} else if (
			fileExt.match( /jpe?g|png|gif|svg/g )
		) {
			// input can be compressed with imagemin

			// normalize jpg file extension
			const outExt = fileExt.replace( 'jpeg', 'jpg' );

			const image = await createImageFile({
				...createOptions,
				type: outExt,
			});

			this.emitFile( `${fileName}.${outExt}`, image.buffer );
			files.push({ ext: outExt, name: 'src' });
		} else {
			// input is in a format that can currently not be compressed,
			// emit file unaltered.

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


		// ADDITIONAL EXPORTS

		if ( exportOptions.emitBasis ) {
			if ( fileExt.match( /png|jpe?g/ ) ) {
				const basis = await createBasisFile({
					...createOptions,
					options: exportOptions.basis,
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
				...createOptions,
				type: 'webp',
			});

			this.emitFile( `${fileName}.webp`, webp.buffer );
			files.push({ ext: 'webp', name: 'webp' });
		}

		if ( exportOptions.emitAvif ) {
			const webp = await createImageFile({
				...createOptions,
				type: 'avif',
			});

			this.emitFile( `${fileName}.avif`, webp.buffer );
			files.push({ ext: 'avif', name: 'avif' });
		}


		// map exports to resolution identifier
		resolutions.set(
			resIdentifier,
			{
				width,
				height,
				files,
				fileName,
				varName: `p${i}`,
			},
		);
	}) );


	// EXPORT META

	const exportMeta: { name: string; value: string | number | boolean }[] = [];

	exportMeta.push(
		{ name: 'alpha', value: !sourceIsOpaque },
		{ name: 'aspect', value: sourceWidth / sourceHeight },
	);

	if ( exportOptions.thumbnail ) {
		const { width, height, format } = exportOptions.thumbnail;

		const thumb = sharp( sourceFileBuffer ).resize(
			width,
			height,
			{ fit: 'fill' },
		);

		const data = format === 'png'
			// encode as png
			? `data:image/png;base64,${
				( await thumb.png().toBuffer() ).toString( 'base64' )
			}`
			// or raw RGBA data
			: ( await thumb.ensureAlpha().raw().toBuffer() ).toString( 'base64' );

		exportMeta.push({
			name: 'thumbnail',
			value: JSON.stringify({
				data,
				width,
				height,
			}),
		});
	}


	// EXPORT

	// export the path and file name of each resolution as a variable
	let paths = '';
	resolutions.forEach( ({ varName, fileName }) => {
		paths += `const ${varName} = __webpack_public_path__ + ${JSON.stringify( fileName )};\n`;
	});


	const sizeToExportString = ( sizeId: string ) => {
		const {
			files, varName, width, height,
		} = resolutions.get( resolutionMap.get( sizeId ) );
		return (
			files
				.map( ({ ext, name }) => (
					`${name}: ${varName} + '.${ext}'`
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
		.filter( sizeId => sizeId !== 'default' )
		.map( ( sizeId ) => (

			`${sizeId}: {
				${sizeToExportString( sizeId )}
			}`

		) ).join( ',' )
}
	}
};
	`;
}
