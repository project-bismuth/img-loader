import { extendDefaultPlugins } from 'svgo';

import BasisOptions from '../types/BasisOptions';
import ImgLoaderOptions, {
	DeepPartial,
	ImgLoaderInternalOptions,
	ImgLoaderQualityOptions,
	ImgLoaderSizeOptions,
} from '../types/ImgLoaderOptions';
import defaultOptions from '../defaultOptions';


function mergeBasisOptions(
	baseOptions: BasisOptions,
	overrideOptions: Partial<BasisOptions>,
): BasisOptions {
	const mergedOptions = {
		...baseOptions,
		...overrideOptions,
	};

	if (
		'quality' in mergedOptions
		&& !( 'quality' in overrideOptions )
		&& ( 'maxEndpoints' in overrideOptions || 'maxSelectors' in overrideOptions )
	) {
		// 'quality' is used to switch between auto and manual ETC1S mode
		// Here the baseOptions are for auto mode, while the overrides are for manual mode.
		// to ensure manual mode is used, delete the quality option.
		delete mergedOptions.quality;
	}

	return mergedOptions as BasisOptions;
}


type ThumbnailMeta = ImgLoaderInternalOptions['thumbnail'];

function mergeThumbnailOptions(
	baseOption: ThumbnailMeta,
	overrideOption: Partial<ThumbnailMeta>,
): ThumbnailMeta {
	if (
		typeof overrideOption === 'undefined'
		|| overrideOption === false
		|| overrideOption === {}
	) {
		return baseOption;
	}

	if ( 'width' in overrideOption && 'height' in overrideOption && 'format' in overrideOption ) {
		return overrideOption as ThumbnailMeta;
	}

	if ( typeof baseOption === 'object' ) {
		return {
			...baseOption,
			...overrideOption,
		};
	}

	return baseOption;
}


function mergeSvgoOptions(
	baseOption: ImgLoaderQualityOptions['svgo'],
	overrideOption: ImgLoaderQualityOptions['svgo'],
): ImgLoaderQualityOptions['svgo'] {
	return {
		...baseOption,
		...overrideOption,
		plugins: extendDefaultPlugins(
			overrideOption.plugins
				? overrideOption.plugins
				: ( baseOption.plugins || []),
		),
	};
}


function mergeBooleanOptions(
	baseOption: boolean,
	overrideOption?: boolean,
): boolean {
	if ( typeof overrideOption === 'boolean' ) return overrideOption;
	return baseOption;
}

function mergeSizeOptions(
	baseOption: Record<string, ImgLoaderSizeOptions>,
	overrideOption: Record<string, DeepPartial<ImgLoaderSizeOptions>> = {},
): Record<string, ImgLoaderSizeOptions> {
	const mergedOptions: Record<string, DeepPartial<ImgLoaderSizeOptions>> = {
		...defaultOptions.sizes,
		...baseOption,
		...overrideOption,
	};


	Object.keys( mergedOptions ).forEach( ( sizeName ) => {
		const baseSize = baseOption[sizeName] || {} as ImgLoaderSizeOptions;
		const overrideSize = overrideOption[sizeName] || {};
		const mergedSize = {
			scale: 1,
			...baseSize,
			...overrideSize,
		};

		if ( 'max' in baseSize && 'max' in overrideSize ) {
			mergedSize.max = {
				...baseSize.max,
				...overrideSize.max,
			};
		}
		mergedSize.max = {
			...defaultOptions.sizes.default.max,
			...mergedSize.max,
		};

		if ( 'min' in baseSize && 'min' in overrideSize ) {
			mergedSize.min = {
				...baseSize.min,
				...overrideSize.min,
			};
		}
		mergedSize.min = {
			...defaultOptions.sizes.default.min,
			...mergedSize.min,
		};

		mergedOptions[sizeName] = mergedSize;
	});

	return mergedOptions as Record<string, ImgLoaderSizeOptions>;
}


interface DeriveQualityOptionsProps {
	options: ImgLoaderOptions;
	mode: string;
	quality: string;
}

export default function deriveExportOptions({
	options,
	mode,
	quality,
}: DeriveQualityOptionsProps ): ImgLoaderInternalOptions {
	const baseQuality = options.qualityLevels[quality];

	let finalQuality = baseQuality;
	if ( mode !== 'default' ) {
		const modeQuality = options.modes[mode].qualityLevels?.[quality];

		if ( modeQuality ) {
			finalQuality = {
				webp: { ...baseQuality.webp, ...( modeQuality.webp || {}) },
				avif: { ...baseQuality.avif, ...( modeQuality.avif || {}) },
				mozjpeg: { ...baseQuality.mozjpeg, ...( modeQuality.mozjpeg || {}) },
				pngquant: {
					...baseQuality.pngquant,
					...( modeQuality.pngquant || {}),
					quality:
						modeQuality.pngquant
						&& modeQuality.pngquant.quality
						&& modeQuality.pngquant.quality.length === 2
							? modeQuality.pngquant.quality as [number, number]
							: baseQuality.pngquant.quality,
				},
				gifsicle: { ...baseQuality.gifsicle, ...( modeQuality.gifsicle || {}) },
				svgo: mergeSvgoOptions( baseQuality.svgo, modeQuality.svgo || {} as unknown ),
				basis: mergeBasisOptions( baseQuality.basis, modeQuality.basis || {}),
			};
		}
	}

	if ( mode === 'default' ) {
		return {
			...finalQuality,
			thumbnail: options.thumbnail,
			emitWebp: options.emitWebp,
			emitAvif: options.emitAvif,
			emitBasis: options.emitBasis,
			forcePowerOfTwo: options.forcePowerOfTwo,
			powerOfTwoStrategy: options.powerOfTwoStrategy,
			skipCompression: options.skipCompression,
			resizeKernel: options.resizeKernel,
			sizes: mergeSizeOptions( options.sizes, {}),
		};
	}

	const modeOptions = options.modes[mode];

	return {
		...finalQuality,
		thumbnail: mergeThumbnailOptions( options.thumbnail, modeOptions.thumbnail ),
		emitWebp: mergeBooleanOptions( options.emitWebp, modeOptions.emitWebp ),
		emitAvif: mergeBooleanOptions( options.emitAvif, modeOptions.emitAvif ),
		emitBasis: mergeBooleanOptions( options.emitBasis, modeOptions.emitBasis ),
		forcePowerOfTwo: mergeBooleanOptions(
			options.forcePowerOfTwo, modeOptions.forcePowerOfTwo,
		),
		powerOfTwoStrategy: modeOptions.powerOfTwoStrategy || options.powerOfTwoStrategy,
		resizeKernel: modeOptions.resizeKernel || options.resizeKernel,
		skipCompression: mergeBooleanOptions(
			options.skipCompression, modeOptions.skipCompression,
		),
		sizes: mergeSizeOptions(
			options.sizes, modeOptions.sizes,
		),
	};
}
