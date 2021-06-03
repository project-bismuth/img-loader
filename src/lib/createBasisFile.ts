import path from 'path';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

import {
	read as cacheRead,
	getFilename,
} from '@bsmth/loader-cache';
import type BasisOptions from '../types/BasisOptions';
import { trackJob, completeJob } from './jobTracker';

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
	reportName: string;
	resource: string;
}

export default async function createBasisFile({
	inputPath,
	options,
	inputHash,
	reportName,
	resource,
}: CreateBasisFileProps ): Promise<{
		buffer: Buffer;
		path: string;
	}> {
	const cached = await cacheRead({ inputHash, options, resource });

	if ( cached ) {
		return cached;
	}

	const outPath = getFilename({ inputHash, options, resource });
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

		if ( options.uastcLevel ) {
			opts.push( `-uastc_level ${options.uastcLevel}` );
		}

		if ( options.uastcRdoQ ) {
			opts.push( `-uastc_rdo_q ${options.uastcRdoQ}` );
		}
	} else {
		if ( 'quality' in options ) {
			// ETC1S with auto options
			opts.push( `-q ${options.quality}` );
		} else {
			// ETC1S with manual options
			opts.push( `-max_endpoints ${options.maxEndpoints}` );
			opts.push( `-max_selectors ${options.maxSelectors}` );
		}

		if ( options.compLevel ) {
			opts.push( `-comp_level ${options.compLevel}` );
		}

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

	const job = trackJob({
		reportName,
		text: 'compressing .basis',
	});

	const { stderr } = await asyncExec( `${bin} ${opts.join( ' ' )}` );


	if ( stderr ) {
		throw new Error( `BASIS COMPRESSION FAILED: ${stderr}` );
	} else {
		completeJob( job );
	}


	return {
		buffer: await fs.readFile( outPath ),
		path: outPath,
	};
}
