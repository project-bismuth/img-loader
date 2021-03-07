import imagemin from 'imagemin';
import imageminMozjpeg from 'imagemin-mozjpeg';
import sharp from 'sharp';

import type { ImgLoaderQualityOptions } from '../types/ImgLoaderOptions';
import { getFile, writeFile } from './cache';


interface CreateJpegFileProps {
	buffer: Buffer;
	options: ImgLoaderQualityOptions['mozjpeg'];
	inputHash: string;
	cacheDir: string;
}

export default async function createJpegFile({
	buffer,
	options,
	inputHash,
	cacheDir,
}: CreateJpegFileProps ): Promise<{
		buffer: Buffer;
		path: string;
	}> {
	const cached = await getFile({
		options,
		inputHash,
		cacheDir,
	});

	if ( cached ) return cached;

	const img = await sharp( buffer ).jpeg({
		quality: 100,
		chromaSubsampling: '4:4:4',
	}).toBuffer();

	const outBuffer = await imagemin.buffer( img, {
		plugins: [
			imageminMozjpeg( options ),
		],
	});

	const path = await writeFile({
		buffer: outBuffer,
		options,
		inputHash,
		cacheDir,
	});

	return {
		buffer: outBuffer,
		path,
	};
}
