import loaderUtils from 'loader-utils';
import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';
import objHash from 'object-hash';

import defaultOptions from './defaultOptions';
import deriveQualityOptions from './lib/deriveExportOptions';
import { ensureCacheReady } from './lib/cache';
import createBasisFile from './lib/createBasisFile';
import { isPowerOfTwo } from './lib/utils';
import makePowerOfTwo from './lib/makePowerOfTwo';
import createWebpFile from './lib/createWebpFile';
import createJpegFile from './lib/createJpegFile';
import createPngFile from './lib/createPngFile';
import generateDeclarations from './lib/generateDeclarations';
import getDefaultQuality from './lib/getDefaultQuality';


interface QueryParams {
	mode?: string;
	quality?: string;
}

let generatedDeclarations = false;

export default async function load( source: string ): Promise<string> {
	if ( this.cacheable ) this.cacheable( false );

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
	const fileName = `${
		temp.join( '.' )}-${objHash( exportOptions ).substr( 0, options.optionHashLength )
	}`;

	await ensureCacheReady();

	const sourceFileStats = await sharp( this.resourcePath ).metadata();
	const sourceFileBuffer = await fs.readFile( this.resourcePath );
	const sourceFileHash = loaderUtils.getHashDigest( sourceFileBuffer, 'md4', 'hex', 32 );

	let inputBuffer: Buffer;
	let inputPath: string;

	if (
		!exportOptions.forcePowerOfTwo
		|| ( isPowerOfTwo( sourceFileStats.width ) && isPowerOfTwo( sourceFileStats.height ) )
	) {
		inputBuffer = sourceFileBuffer;
		inputPath = this.resourcePath;
	} else {
		const resizedTexture = await makePowerOfTwo({
			width: sourceFileStats.width,
			height: sourceFileStats.height,
			inputHash: sourceFileHash,
			inputBuffer: sourceFileBuffer,
			strategy: exportOptions.powerOfTwoStrategy,
			reportName: relativePath,
			resource,
		});

		inputBuffer = resizedTexture.buffer;
		inputPath = resizedTexture.path;
	}

	const inputHash = loaderUtils.getHashDigest( inputBuffer, 'md4', 'hex', 32 );

	const exportFiles: { ext: string; name: string }[] = [];

	if ( exportOptions.emitBasis ) {
		const basis = await createBasisFile({
			inputHash,
			inputPath,
			options: exportOptions.basis,
			reportName: relativePath,
			resource,
		});

		this.emitFile( `${fileName}.basis`, basis.buffer );
		exportFiles.push({ ext: 'basis', name: 'basis' });
	}

	if ( exportOptions.emitWebp ) {
		const webp = await createWebpFile({
			inputHash,
			buffer: inputBuffer,
			options: exportOptions.webp,
			reportName: relativePath,
			resource,
		});

		this.emitFile( `${fileName}.webp`, webp.buffer );
		exportFiles.push({ ext: 'webp', name: 'webp' });
	}

	if ( exportOptions.skipCompression ) {
		this.emitFile( `${fileName}.${fileExt}`, inputBuffer );
		exportFiles.push({ ext: fileExt, name: 'src' });
	} else if ( fileExt === 'jpg' || fileExt === 'jpeg' ) {
		const jpg = await createJpegFile({
			inputHash,
			buffer: inputBuffer,
			options: exportOptions.mozjpeg,
			reportName: relativePath,
			resource,
		});

		this.emitFile( `${fileName}.jpg`, jpg.buffer );
		exportFiles.push({ ext: fileExt, name: 'src' });
	} else if ( fileExt === 'png' ) {
		const png = await createPngFile({
			inputHash,
			buffer: inputBuffer,
			options: exportOptions.pngquant,
			reportName: relativePath,
			resource,
		});

		this.emitFile( `${fileName}.png`, png.buffer );
		exportFiles.push({ ext: fileExt, name: 'src' });
	} else {
		this.emitWarning(
			`${
				fileExt
			} files are currently not supported, the file will not be compressed.`,
		);

		this.emitFile( `${fileName}.${fileExt}`, inputBuffer );
		exportFiles.push({ ext: fileExt, name: 'src' });
	}


	const exportMeta: { name: string; value: string | number | boolean }[] = [];

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

	exportMeta.push(
		{ name: 'width', value: sourceFileStats.width },
		{ name: 'height', value: sourceFileStats.height },
		{ name: 'alpha', value: sourceFileStats.hasAlpha },
	);


	return `
		const u = __webpack_public_path__ + ${JSON.stringify( fileName )};
		module.exports = {
			prefix: __webpack_public_path__,
			${exportFiles.map( ({ ext, name }) => `${name}: u + '.${ext}'` ).join( ',' )},
			${exportMeta.map( ({ name, value }) => `${name}: ${value}` ).join( ',' )}
		};
	`;
}
