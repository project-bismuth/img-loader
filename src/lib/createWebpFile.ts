import sharp from 'sharp';

import type { ImgLoaderQualityOptions } from '../types/ImgLoaderOptions';
import { getFile, writeFile } from './cache';


interface CreateWebpFileProps {
	buffer: Buffer;
	options: ImgLoaderQualityOptions['webp'];
	inputHash: string;
	cacheDir: string;
}

export default async function createWebpFile({
	buffer,
	options,
	inputHash,
	cacheDir,
}: CreateWebpFileProps ): Promise<{
		buffer: Buffer;
		path: string;
	}> {
	const cached = await getFile({
		options,
		inputHash,
		cacheDir,
	});

	if ( cached ) return cached;

	const outBuffer = await sharp( buffer ).webp( options ).toBuffer();
	const path = await writeFile({
		buffer: outBuffer,
		options,
		inputHash,
		cacheDir,
	});

	return {
		path,
		buffer: outBuffer,
	};
}
