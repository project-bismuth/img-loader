import imagemin from 'imagemin';
import imageminMozjpeg from 'imagemin-mozjpeg';
import sharp from 'sharp';

import type { ImgLoaderQualityOptions } from '../types/ImgLoaderOptions';
import { getFile, writeFile } from './cache';
import { completeJob, trackJob } from './jobTracker';


interface CreateJpegFileProps {
	buffer: Buffer;
	options: ImgLoaderQualityOptions['mozjpeg'];
	inputHash: string;
	resource: string;
	reportName: string;
}

export default async function createJpegFile({
	buffer,
	options,
	inputHash,
	resource,
	reportName,
}: CreateJpegFileProps ): Promise<{
		buffer: Buffer;
		path: string;
	}> {
	const cached = await getFile({
		options,
		inputHash,
		resource,
	});

	if ( cached ) return cached;

	const job = trackJob({
		reportName,
		text: 'compressing .jpg',
	});

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
		resource,
	});

	completeJob( job );

	return {
		buffer: outBuffer,
		path,
	};
}
