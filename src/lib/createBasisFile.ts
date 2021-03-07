import path from 'path';
import fs from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';
import ora from 'ora';

import type BasisOptions from '../types/BasisOptions';
import { getFile, getFilename } from './cache';

const asyncExec = promisify( exec );


const binaries = new Map([
	['darwin', 'darwin/basisu'],
	['win32', 'win32/basisu.exe'],
	['linux', 'linux/basisu'],
]);

if ( !binaries.has( process.platform ) ) {
	throw new Error( `Your current platform "${ process.platform }" is not supported.` );
}

const bin = path.resolve( __dirname, '../../bin/basis', binaries.get( process.platform ) );


interface CreateBasisFileProps {
	inputPath: string;
	options: BasisOptions;
	inputHash: string;
	cacheDir: string;
}

export default async function createBasisFile({
	inputPath,
	options,
	inputHash,
	cacheDir,
}: CreateBasisFileProps ): Promise<{
		buffer: Buffer;
		path: string;
	}> {
	const cached = await getFile({ inputHash, options, cacheDir });

	if ( cached ) {
		return cached;
	}

	const outPath = getFilename({ inputHash, options, cacheDir });
	const opts: string[] = [];

	opts.push( `-file ${inputPath}` );
	opts.push( `-output_file ${outPath}` );


	if ( options.yFlip ) opts.push( '-y_flip' );

	if ( options.normalMap ) opts.push( '-normal_map' );

	if ( options.separateRgToColorAlpha ) opts.push( '-separate_rg_to_color_alpha' );

	if ( options.forceAlpha ) opts.push( '-force_alpha' );


	if ( options.linear ) {
		opts.push( '-linear' );
		if ( options.mipmaps ) opts.push( '-mip_linear' );
	}


	if ( options.mipmaps ) {
		opts.push( '-mipmap' );
		opts.push( `-mip_filter ${options.mipFilter}` );
	}


	if ( options.codec === 'UASTC' ) {
		opts.push( '-uastc' );
		opts.push( `-uastc_level ${options.uastcLevel}` );
		opts.push( `-uastc_rdo_q ${options.uastcRdoQ}` );
	} else {
		if ( 'quality' in options ) {
			// ETC1S with auto options
			opts.push( `-q ${options.quality}` );
		} else {
			// ETC1S with manual options
			opts.push( `-max_endpoints ${options.maxEndpoints}` );
			opts.push( `-max_selectors ${options.maxSelectors}` );
		}

		opts.push( `-comp_level ${options.compLevel}` );

		if ( options.noEndpointRdo ) {
			opts.push( '-no_endpoint_rdo' );
		}

		if ( options.noSelectorRdo ) {
			opts.push( '-no_selector_rdo' );
		}

		if ( options.disableHierarchicalEndpointCodebook ) {
			opts.push( '-disable_hierarchical_endpoint_codebook' );
		}
	}

	const spinner = ora( `compressing ${inputPath}` );
	spinner.spinner = 'triangle';
	spinner.start();

	const { stderr } = await asyncExec( `${bin} ${opts.join( ' ' )}` );

	// eslint-disable-next-line no-console
	// console.log( stdout );

	if ( stderr ) {
		spinner.fail();
		throw new Error( `BASIS COMPRESSION FAILED: ${stderr}` );
	} else {
		spinner.succeed();
	}


	return {
		buffer: await fs.readFile( outPath ),
		path: outPath,
	};
}
