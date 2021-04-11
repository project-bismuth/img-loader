import type { Compiler, NormalModule } from 'webpack';

import { clearStaleFiles, ensureCacheReady, prime as primeCache } from './lib/cache';


interface CachePluginProps {
	enabled: boolean;
	deleteUnusedFiles: boolean;
	aggressive: boolean;
	cacheDir: string;
}

export default class BismuthCachePlugin {
	private enabled: boolean;
	private deleteUnusedFiles: boolean;
	private aggressive: boolean;
	private runs = 0;

	constructor({
		enabled = true,
		deleteUnusedFiles = true,
		aggressive = true,
		cacheDir = '.img-loader-cache',
	}: Partial<CachePluginProps> = {}) {
		this.enabled = enabled;
		this.deleteUnusedFiles = deleteUnusedFiles;
		this.aggressive = aggressive;

		primeCache({
			cacheDir,
		});
	}

	apply( compiler: Compiler ): void {
		if ( this.enabled ) {
			compiler.hooks.done.tapAsync(
				'BismuthCachePlugin', async ( stats, cb: () => void ) => {
					await ensureCacheReady();

					if ( this.deleteUnusedFiles && ( this.aggressive || ( this.runs < 1 ) ) ) {
						this.runs += 1;

						clearStaleFiles(
							Array.from(
								stats.compilation.modules,
							).map(
								( m: NormalModule ) => m.userRequest,
							),
						).then( () => cb() );
					} else {
						cb();
					}
				},
			);
		}
	}
}
