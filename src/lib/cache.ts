import objHash from 'object-hash';
import path from 'path';
import { promises as fs } from 'fs';
import chalk from 'chalk';

import { fileExists } from './utils';


interface CacheProps {
	inputHash: string;
	options: unknown;
	resource: string;
	ext?: string;
}


let isPrimed = false;
let cacheDir = '';
let cacheReady: Promise<string|void>;
const initialFiles: string[] = [];
const cacheMap = new Map<string, string[]>();


export async function clearStaleFiles( usedFiles: string[]): Promise<void[]|void> {
	const usedCacheFiles: string[] = [];
	const potentiallyStaleFiles: string[] = [
		...initialFiles.map( f => path.resolve( cacheDir, f ) ),
	];

	initialFiles.length = 0;

	cacheMap.forEach( ( cacheFiles, key ) => {
		if ( usedFiles.includes( key ) ) {
			usedCacheFiles.push( ...cacheFiles );
		} else {
			potentiallyStaleFiles.push( ...cacheFiles );
			cacheMap.delete( key );
		}
	});

	const staleFiles = new Set(
		potentiallyStaleFiles.filter( file => !usedCacheFiles.includes( file ) ),
	);

	if ( staleFiles.size > 0 ) {
		// eslint-disable-next-line no-console
		console.info( chalk.yellow(
			`deleting ${staleFiles.size} stale files...`,
		) );

		return Promise.all(
			Array.from( staleFiles.values() ).map( file => fs.unlink( file ) ),
		);
	}

	return Promise.resolve();
}


export async function prime({
	cacheDir: _cacheDir,
}: {
	cacheDir: string;
}): Promise<string|void> {
	cacheReady = ( async () => {
		if ( !isPrimed ) {
			cacheDir = _cacheDir;
			isPrimed = true;

			initialFiles.push(
				...await fs.readdir( path.resolve( cacheDir ) ),
			);

			return fs.mkdir( cacheDir, { recursive: true });
		}

		return Promise.resolve();
	})();

	return cacheReady;
}


export async function ensureCacheReady(): Promise<string|void> {
	return cacheReady;
}


export function getFilename({
	inputHash,
	options,
	resource,
	ext = '',
}: CacheProps ): string {
	const name = path.resolve( cacheDir, `${inputHash}-${objHash( options )}${ext}` );

	if ( !cacheMap.has( resource ) ) cacheMap.set( resource, []);

	cacheMap.get( resource ).push( name );

	return name;
}


export async function getFile( opts: CacheProps ): Promise<{
	buffer: Buffer;
	path: string;
} | false> {
	const fileName = getFilename( opts );

	if ( !await fileExists( fileName ) ) return false;

	return {
		buffer: await fs.readFile( fileName ),
		path: fileName,
	};
}


export async function writeFile({
	buffer,
	...opts
}: CacheProps & { buffer: Buffer }): Promise<string> {
	const fileName = getFilename( opts );

	await fs.writeFile( fileName, buffer );
	return fileName;
}
