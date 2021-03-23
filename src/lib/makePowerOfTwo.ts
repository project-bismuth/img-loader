import sharp from 'sharp';

import type ImgLoaderOptions from '../types/ImgLoaderOptions';
import { getFile, writeFile } from './cache';


function nextPowerOfTwo( n: number ) {
	return 2 ** Math.ceil( Math.log( n ) / Math.LN2 );
}


function previousPowerOfTwo( n: number ) {
	return 2 ** Math.floor( Math.log( n ) / Math.LN2 );
}


function nearestPowerOfTwo( n: number ) {
	return 2 ** Math.round( Math.log( n ) / Math.LN2 );
}


function getPowerOfTwoSize(
	width: number,
	height: number,
	strategy:ImgLoaderOptions['powerOfTwoStrategy'],
): [number, number] {
	switch ( strategy ) {
	case 'upscale':
		return [nextPowerOfTwo( width ), nextPowerOfTwo( height )];

	case 'downscale':
		return [previousPowerOfTwo( width ), previousPowerOfTwo( height )];

	case 'nearest':
		return [nearestPowerOfTwo( width ), nearestPowerOfTwo( height )];

	default:
		break;
	}

	const srcArea = width * height;
	const lowWidth = previousPowerOfTwo( width );
	const highWidth = nextPowerOfTwo( width );
	const lowHeight = previousPowerOfTwo( height );
	const highHeight = nextPowerOfTwo( height );

	const sizes = [
		[lowWidth, lowHeight],
		[highWidth, highHeight],
		[lowWidth, highHeight],
		[highWidth, lowHeight],
	]
		.map( ([x, y]) => [x, y, Math.abs( x * y - srcArea )])
		.sort( ( a, b ) => a[2] - b[2]);

	if ( sizes[0][2] === sizes[1][2]) {
		const d = [
			[sizes[0][0], sizes[0][1]],
			[sizes[1][0], sizes[1][1]],
		]
			.map( ([x, y]) => [x, y, Math.abs( x - width ) + Math.abs( y - height )])
			.sort( ( a, b ) => a[2] - b[2]);

		return [d[0][0], d[0][1]];
	}

	return [sizes[0][0], sizes[0][1]];
}


interface MakePowerOfTwoProps {
	inputHash: string;
	inputBuffer: Buffer;
	strategy: ImgLoaderOptions['powerOfTwoStrategy'];
	width: number;
	height: number;
}

export default async function makePowerOfTwo({
	width,
	height,
	strategy = 'area',
	inputHash,
	inputBuffer,
}: MakePowerOfTwoProps ): Promise<{
		buffer: Buffer;
		path: string;
	}> {
	const size = getPowerOfTwoSize( width, height, strategy );
	const cacheOpts = {
		inputHash,
		options: size,
		ext: '.png',
	};

	const cached = await getFile( cacheOpts );

	if ( cached ) return cached;

	const texture = sharp( inputBuffer );
	texture.resize( size[0], size[1], { fit: 'fill' });

	const buffer = await texture.png().toBuffer();

	return {
		buffer,
		path: await writeFile({
			buffer,
			...cacheOpts,
		}),
	};
}
