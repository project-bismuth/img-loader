import imagemin from 'imagemin';
import imageminPngquant from 'imagemin-pngquant';
import sharp from 'sharp';

import type { ImgLoaderQualityOptions } from '../types/ImgLoaderOptions';
import { getFile, writeFile } from './cache';


interface CreatePngFileProps {
	buffer: Buffer;
	options: ImgLoaderQualityOptions['pngquant'];
	inputHash: string;
	resource: string;
}

export default async function createPngFile({
	buffer,
	options,
	inputHash,
	resource,
}: CreatePngFileProps ): Promise<{
		buffer: Buffer;
		path: string;
	}> {
	const cached = await getFile({
		options,
		inputHash,
		resource,
	});

	if ( cached ) return cached;

	const img = await sharp( buffer ).png().toBuffer();

	const outBuffer = await imagemin.buffer( img, {
		plugins: [
			imageminPngquant( options ),
		],
	});

	const path = await writeFile({
		buffer: outBuffer,
		options,
		inputHash,
		resource,
	});

	return {
		buffer: outBuffer,
		path,
	};
}
