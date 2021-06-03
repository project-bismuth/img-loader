import { deprecate } from 'util';
import { CachePlugin as _CachePlugin } from '@bsmth/loader-cache';

export { default } from './loader';

export const CachePlugin = deprecate(
	_CachePlugin,
	'[@bsmth/img-loader]: CachePlugin has moved to `@bsmth/loader-cache`, '
	+ 'please import it from there instead.',
);

export const raw = true;
