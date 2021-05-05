import * as fs from 'fs';
import type ImgLoaderOptions from '../types/ImgLoaderOptions';


export async function fileExists(
	file: string,
): Promise<boolean> {
	return fs.promises.access( file, fs.constants.F_OK )
		.then( () => true )
		.catch( () => false );
}


export function isPowerOfTwo( x:number ): boolean {
	return Math.log2( x ) % 1 === 0;
}


function nextPowerOfTwo( n: number ) {
	return 2 ** Math.ceil( Math.log( n ) / Math.LN2 );
}


function previousPowerOfTwo( n: number ) {
	return 2 ** Math.floor( Math.log( n ) / Math.LN2 );
}


function nearestPowerOfTwo( n: number ) {
	return 2 ** Math.round( Math.log( n ) / Math.LN2 );
}


export function getPowerOfTwoSize(
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
