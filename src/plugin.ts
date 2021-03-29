import type { Compiler, NormalModule } from 'webpack';

import { clearStaleFiles } from './lib/cache';


interface ClearCachePluginProps {
	enabled: boolean;
	aggressive: boolean;
}

export default class ClearCachePlugin {
	private enabled: boolean;
	private aggressive: boolean;
	private runs = 0;

	constructor({
		enabled = true,
		aggressive = true,
	}: Partial<ClearCachePluginProps> = {}) {
		this.enabled = enabled;
		this.aggressive = aggressive;
	}

	apply( compiler: Compiler ): void {
		compiler.hooks.done.tapAsync(
			'BismuthClearCachePlugin', async ( stats, cb: () => void ) => {
				if ( this.enabled && ( this.aggressive || ( this.runs < 1 ) ) ) {
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
