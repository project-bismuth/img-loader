import imagemin from 'imagemin';
import imageminGifsicle from 'imagemin-gifsicle';

import type { ImgLoaderQualityOptions } from '../types/ImgLoaderOptions';
import { getFile, writeFile } from './cache';
import { completeJob, trackJob } from './jobTracker';


interface CreateGifFileProps {
	buffer: Buffer;
	options: ImgLoaderQualityOptions['gifsicle'];
	inputHash: string;
	resource: string;
	reportName: string;
}

export default async function createGifFile({
	buffer,
	options,
	inputHash,
	resource,
	reportName,
}: CreateGifFileProps ): Promise<{
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
		text: 'compressing .gif',
	});

	const outBuffer = await imagemin.buffer( buffer, {
		plugins: [
			imageminGifsicle( options ),
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
