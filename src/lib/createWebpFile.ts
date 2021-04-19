import sharp from 'sharp';

import type { ImgLoaderQualityOptions } from '../types/ImgLoaderOptions';
import { getFile, writeFile } from './cache';
import { completeJob, trackJob } from './jobTracker';


interface CreateWebpFileProps {
	buffer: Buffer;
	options: ImgLoaderQualityOptions['webp'];
	inputHash: string;
	resource: string;
	reportName: string;
}

export default async function createWebpFile({
	buffer,
	options,
	inputHash,
	resource,
	reportName,
}: CreateWebpFileProps ): Promise<{
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
		text: 'compressing .webp',
	});

	const outBuffer = await sharp( buffer ).webp( options ).toBuffer();
	const path = await writeFile({
		buffer: outBuffer,
		options,
		inputHash,
		resource,
	});

	completeJob( job );

	return {
		path,
		buffer: outBuffer,
	};
}
