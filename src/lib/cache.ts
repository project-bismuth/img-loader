import objHash from 'object-hash';
import path from 'path';
import fs from 'fs/promises';

import { fileExists } from './utils';


interface ChacheProps {
	inputHash: string;
	options: unknown;
	cacheDir: string;
}

export function getFilename({
	inputHash,
	options,
	cacheDir,
}: ChacheProps ): string {
	return path.resolve( cacheDir, `${inputHash}-${objHash( options )}` );
}


export async function getFile( opts: ChacheProps ): Promise<{
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
}: ChacheProps & { buffer: Buffer }): Promise<string> {
	const fileName = getFilename( opts );

	await fs.writeFile( fileName, buffer );
	return fileName;
}


export async function ensureCacheDir( cacheDir: string ): Promise<string> {
	return fs.mkdir( cacheDir, { recursive: true });
}
