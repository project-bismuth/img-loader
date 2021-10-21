import imagemin from 'imagemin';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import imageminSvgo from 'imagemin-svgo';
import imageminGifsicle from 'imagemin-gifsicle';

import sharp from 'sharp';
import {
	read as cacheRead,
	write as cacheWrite,
} from '@bsmth/loader-cache';
import { trackJob } from '@bsmth/loader-progress';
import type { ImgLoaderQualityOptions } from '../types/ImgLoaderOptions';


interface CreateImageFileProps {
	buffer: Buffer;
	options: ImgLoaderQualityOptions;
	type: string;
	inputHash: string;
	resource: string;
	reportName: string;
}


const compressorForType: Record<string, keyof ImgLoaderQualityOptions> = {
	jpg: 'mozjpeg',
	png: 'pngquant',
	webp: 'webp',
	avif: 'avif',
	gif: 'gifsicle',
	svg: 'svgo',
};

export default async function createImageFile({
	buffer,
	options,
	type,
	inputHash,
	resource,
	reportName,
}: CreateImageFileProps ): Promise<{
		buffer: Buffer;
		path: string;
	}> {
	const relevantOptions = options[compressorForType[type]];

	const cached = await cacheRead({
		options: relevantOptions,
		inputHash,
		resource,
	});

	if ( cached ) return cached;

	const completeJob = trackJob({
		reportName,
		text: `compressing .${type}`,
	});

	let inBuffer = buffer;
	let outBuffer;

	if ( type === 'jpg' && ( await sharp( inBuffer ).metadata() ).format !== 'jpeg' ) {
		// inBuffer is a PNG buffer from the resizing step,
		// but the desired output is JPG.
		// Convert to a JPG buffer, so that it is
		// run through mozjpeg in the next step.
		inBuffer = await sharp( inBuffer ).jpeg({
			quality: 100,
			chromaSubsampling: '4:4:4',
		}).toBuffer();
	}

	if ( type === 'webp' ) {
		outBuffer = await sharp( inBuffer ).webp( options.webp ).toBuffer();
	} else if ( type === 'avif' ) {
		outBuffer = await sharp( inBuffer ).avif( options.avif ).toBuffer();
	} else {
		outBuffer = await imagemin.buffer( inBuffer, {
			plugins: [
				imageminMozjpeg( options.mozjpeg ),
				imageminPngquant( options.pngquant ),
				imageminSvgo( options.svgo as unknown ),
				imageminGifsicle( options.gifsicle ),
			],
		});
	}

	const path = await cacheWrite({
		buffer: outBuffer,
		options: relevantOptions,
		inputHash,
		resource,
	});

	completeJob();

	return {
		buffer: outBuffer,
		path,
	};
}
