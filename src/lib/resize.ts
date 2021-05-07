import sharp from 'sharp';

import type {
	ImgLoaderInternalOptions,
	ImgLoaderSizeOptions,
} from '../types/ImgLoaderOptions';
import { getFile, writeFile } from './cache';
import { completeJob, trackJob } from './jobTracker';
import { getPowerOfTwoSize } from './utils';


interface ResizeProps {
	inputHash: string;
	inputBuffer: Buffer;
	sizeOpts: ImgLoaderSizeOptions;
	options: ImgLoaderInternalOptions;
	width: number;
	height: number;
	resource: string;
	reportName: string;
}

export default async function resize({
	width: originalWidth,
	height: originalHeight,
	sizeOpts,
	options,
	resource,
	inputHash,
	inputBuffer,
	reportName,
}: ResizeProps ): Promise<{
		buffer: Buffer;
		path: string;
		width: number;
		height: number;
	} | false> {
	const minimum = Math.max(
		sizeOpts.min.width / originalWidth,
		sizeOpts.min.height / originalHeight,
	);
	const scale = Math.min(
		1, // ensure that there's no upscaling
		Math.max(
			minimum,
			Math.min(
				sizeOpts.max.width / originalWidth,
				sizeOpts.max.height / originalHeight,
				sizeOpts.scale,
			),
		),
	);

	const [
		width,
		height,
	] = options.forcePowerOfTwo
		? getPowerOfTwoSize(
			originalWidth * scale,
			originalHeight * scale,
			options.powerOfTwoStrategy,
		)
		: [
			Math.round( originalWidth * scale ),
			Math.round( originalHeight * scale ),
		];


	if ( width === originalWidth && height === originalHeight ) {
		// no resizing necessary, use original
		return false;
	}

	const cacheOpts = {
		inputHash,
		options: [width, height],
		ext: '.png',
		resource,
	};

	const cached = await getFile( cacheOpts );

	if ( cached ) {
		return {
			...cached,
			width,
			height,
		};
	}

	const job = trackJob({
		reportName,
		text: 'resizing',
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
		width,
		height,
	};
}
