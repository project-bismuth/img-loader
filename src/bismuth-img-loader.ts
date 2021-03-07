import loaderUtils from 'loader-utils';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import objHash from 'object-hash';

import defaultOptions from './defaultOptions';
import deriveQualityOptions from './lib/deriveExportOptions';
import { ensureCacheDir } from './lib/cache';
import createBasisFile from './lib/createBasisFile';
import { isPowerOfTwo } from './lib/utils';
import makePowerOfTwo from './lib/makePowerOfTwo';
import createWebpFile from './lib/createWebpFile';
import createJpegFile from './lib/createJpegFile';
import createPngFile from './lib/createPngFile';
import getDefaultQuality from './lib/getDefaultQuality';


interface QueryParams {
	mode?: string;
	quality?: string;
}

export default async function load( source: string ): Promise<string> {
	if ( this.cacheable ) this.cacheable();

	const options = { ...defaultOptions, ...( loaderUtils.getOptions( this ) || {}) };
	const context = options.context || this.rootContext;
	const params = this.resourceQuery
		? loaderUtils.parseQuery( this.resourceQuery ) as QueryParams
		: {};
	const interpolatedName = loaderUtils.interpolateName( this, options.name, {
		context,
		content: source,
	});

	const outputPath = ( 'outputPath' in options )
		? path.join( options.outputPath, interpolatedName )
		: interpolatedName;

	const relativePath = this.resourcePath.replace( this.rootContext, '' );


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


	const temp = outputPath.split( '.' );
	const fileExt = temp.pop().toLowerCase();
	const fileName = `${
		temp.join( '.' )}-${objHash( exportOptions ).substr( 0, options.optionHashLength )
	}`;


	ensureCacheDir( options.cacheDir );

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
			cacheDir: options.cacheDir,
		});

		inputBuffer = resizedTexture.buffer;
		inputPath = resizedTexture.path;
	}

	const inputHash = loaderUtils.getHashDigest( inputBuffer, 'md4', 'hex', 32 );
	const { cacheDir } = options;

	const exportFiles: { ext: string; name: string }[] = [];

	if ( exportOptions.emitBasis ) {
		const basis = await createBasisFile({
			inputHash,
			inputPath,
			options: exportOptions.basis,
			cacheDir,
		});

		this.emitFile( `${fileName}.basis`, basis.buffer );
		exportFiles.push({ ext: 'basis', name: 'basis' });
	}

	if ( exportOptions.emitWebp ) {
		const webp = await createWebpFile({
			inputHash,
			buffer: inputBuffer,
			options: exportOptions.webp,
			cacheDir,
		});

		this.emitFile( `${fileName}.webp`, webp.buffer );
		exportFiles.push({ ext: 'webp', name: 'webp' });
	}

	if ( fileExt === 'jpg' || fileExt === 'jpeg' ) {
		const jpg = await createJpegFile({
			inputHash,
			buffer: inputBuffer,
			options: exportOptions.mozjpeg,
			cacheDir,
		});

		this.emitFile( `${fileName}.jpg`, jpg.buffer );
		exportFiles.push({ ext: fileExt, name: 'src' });
	} else if ( fileExt === 'png' ) {
		const png = await createPngFile({
			inputHash,
			buffer: inputBuffer,
			options: exportOptions.pngquant,
			cacheDir,
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

	const exportMeta: { name: string; value: string }[] = [];

	if ( exportOptions.thumbnail ) {
		const thumb = await sharp( sourceFileBuffer ).resize(
			exportOptions.thumbnail.width,
			exportOptions.thumbnail.height,
			{ fit: 'fill' },
		)
			.raw()
			.ensureAlpha()
			.toBuffer();

		exportMeta.push({
			name: 'thumbnail',
			value: JSON.stringify({
				data: thumb.toString( 'base64' ),
				width: exportOptions.thumbnail.width,
				height: exportOptions.thumbnail.height,
			}),
		});
	}


	return `
		const u = __webpack_public_path__ + ${JSON.stringify( fileName )};
		module.exports = {
			prefix: __webpack_public_path__,
			${exportFiles.map( ({ ext, name }) => `${name}: u + '.${ext}'` ).join( ',' )},
			${exportMeta.map( ({ name, value }) => `${name}: ${value}` ).join( ',' )}
		};
	`;
}

export const raw = true;
