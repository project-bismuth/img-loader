import sharp from 'sharp';

import type { ImgLoaderInternalOptions } from '../types/ImgLoaderOptions';
import { getFile, writeFile } from './cache';
import { completeJob, trackJob } from './jobTracker';


interface ResizeProps {
	inputHash: string;
	inputBuffer: Buffer;
	options: ImgLoaderInternalOptions;
	width: number;
	height: number;
	resource: string;
	reportName: string;
}

export default async function resize({
	width,
	height,
	options,
	resource,
	inputHash,
	inputBuffer,
	reportName,
}: ResizeProps ): Promise<{
		buffer: Buffer;
		path: string;
	}> {
	const cacheOpts = {
		inputHash,
		options: [width, height],
		ext: '.png',
		resource,
	};

	const cached = await getFile( cacheOpts );

	if ( cached ) return cached;

	const job = trackJob({
		reportName,
		text: options.forcePowerOfTwo ? 'resizing to POT' : 'downscaling',
	});

	const texture = sharp( inputBuffer );
	texture.resize({
		width,
		height,
		fit: 'fill',
		fastShrinkOnLoad: false,
		kernel: options.resizeKernel,
	});

	const buffer = await texture.png().toBuffer();
	const path = await writeFile({
		buffer,
		...cacheOpts,
	});

	completeJob( job );

	return {
		buffer,
		path,
	};
}
