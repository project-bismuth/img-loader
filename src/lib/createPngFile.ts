import imagemin from 'imagemin';
import imageminPngquant from 'imagemin-pngquant';
import sharp from 'sharp';

import type { ImgLoaderQualityOptions } from '../types/ImgLoaderOptions';
import { getFile, writeFile } from './cache';
import { completeJob, trackJob } from './jobTracker';


interface CreatePngFileProps {
	buffer: Buffer;
	options: ImgLoaderQualityOptions['pngquant'];
	inputHash: string;
	resource: string;
	reportName: string;
}

export default async function createPngFile({
	buffer,
	options,
	inputHash,
	resource,
	reportName,
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

	const job = trackJob({
		reportName,
		text: 'compressing .png',
	});

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

	completeJob( job );

	return {
		buffer: outBuffer,
		path,
	};
}
