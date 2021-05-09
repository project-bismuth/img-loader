import * as fs from 'fs';


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
