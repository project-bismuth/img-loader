import objHash from 'object-hash';
import path from 'path';
import { promises as fs } from 'fs';

import { fileExists } from './utils';


interface CacheProps {
	inputHash: string;
	options: unknown;
	ext?: string;
}


let isPrimed = false;
let cacheDir = '';
let trackCacheUsage = false;
let usageHistoryFileReady: Promise<void>;

export async function prime({
	cacheDir: _cacheDir,
	trackCacheUsage: _trackCacheUsage,
	deleteUnusedCacheFiles,
}: {
	cacheDir: string;
	trackCacheUsage: boolean;
	deleteUnusedCacheFiles: boolean;
}): Promise<string|void> {
	if ( !isPrimed ) {
		cacheDir = _cacheDir;
		trackCacheUsage = _trackCacheUsage;
		isPrimed = true;

		await fs.mkdir( cacheDir, { recursive: true });

		const usageHistoryFile = path.resolve( cacheDir, 'usage.txt' );

		if ( deleteUnusedCacheFiles && await fileExists( usageHistoryFile ) ) {
			const usedFiles = (
				await fs.readFile( usageHistoryFile, { encoding: 'utf-8' })
			).split( '\n' );

			if ( usedFiles.length > 1 ) {
				const unusedFiles = (
					await fs.readdir( path.resolve( cacheDir ) )
				).filter( v => !usedFiles.includes( v ) );

				// eslint-disable-next-line no-console
				console.info( `deleting ${unusedFiles.length} stale files...` );
				await Promise.all(
					unusedFiles.map( f => fs.unlink( path.resolve( cacheDir, f ) ) ),
				);
			} else {
				// eslint-disable-next-line no-console
				console.info( 'No files flagged as in use. This may be an error. Skipping...' );
			}
		}
		if ( trackCacheUsage ) {
			usageHistoryFileReady = fs.writeFile( usageHistoryFile, '' );
			return usageHistoryFileReady;
		}
	} else if ( trackCacheUsage ) {
		return usageHistoryFileReady;
	}

	return Promise.resolve();
}


export function getFilename({
	inputHash,
	options,
	ext = '',
}: CacheProps ): string {
	const name = `${inputHash}-${objHash( options )}${ext}`;

	if ( trackCacheUsage ) fs.appendFile( path.resolve( cacheDir, 'usage.txt' ), `\n${name}` );

	return path.resolve( cacheDir, name );
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
