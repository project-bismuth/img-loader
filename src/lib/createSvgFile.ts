import imagemin from 'imagemin';
import imageminSvgo from 'imagemin-svgo';

import type { ImgLoaderQualityOptions } from '../types/ImgLoaderOptions';
import { getFile, writeFile } from './cache';
import { completeJob, trackJob } from './jobTracker';


interface CreateSvgFileProps {
	buffer: Buffer;
	options: ImgLoaderQualityOptions['svgo'];
	inputHash: string;
	resource: string;
	reportName: string;
}

export default async function createSvgFile({
	buffer,
	options,
	inputHash,
	resource,
	reportName,
}: CreateSvgFileProps ): Promise<{
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
		text: 'compressing .svg',
	});

	const outBuffer = await imagemin.buffer( buffer, {
		plugins: [
			imageminSvgo( options as unknown ),
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
