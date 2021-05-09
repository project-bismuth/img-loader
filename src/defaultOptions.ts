import type ImgLoaderOptions from './types/ImgLoaderOptions';

const defaultOptions: ImgLoaderOptions = {
	name: '[name].[contenthash:6].[ext]',
	outputPath: '',
	optionHashLength: 4,
	generateDeclarations: false,
	thumbnail: {
		width: 4,
		height: 4,
		format: 'raw',
	},
	emitWebp: true,
	emitBasis: false,
	skipCompression: false,
	forcePowerOfTwo: false,
	powerOfTwoStrategy: 'area',
	resizeKernel: 'lanczos3',
	sizes: {
		default: {
			scale: 1,
			max: {
				width: Infinity,
				height: Infinity,
			},
			min: {
				width: 1,
				height: 1,
			},
		},
	},
	defaultQualityLevel: 'medium',
	qualityLevels: {
		low: {
			webp: {
				quality: 60,
				alphaQuality: 40,
				reductionEffort: 5,
			},
			pngquant: {
				quality: [.3, .6],
				strip: true,
				speed: 5,
			},
			mozjpeg: {
				quality: 50,
				progressive: true,
			},
			gifsicle: {
				optimizationLevel: 3,
			},
			svgo: {
				floatPrecision: 2,
				plugins: [
					{
						name: 'removeViewBox',
						active: false,
					},
					{
						name: 'removeDimensions',
						active: true,
					},
					{
						name: 'reusePaths',
						active: true,
					},
				],
			},
			basis: {
				codec: 'ETC1S',
				forceAlpha: true,
				mipmaps: true,
				mipFilter: 'lanczos3',
				linear: true,
				compLevel: 2,
				quality: 180,
				yFlip: false,
				noEndpointRdo: false,
				noSelectorRdo: false,
				normalMap: false,
				separateRgToColorAlpha: false,
				disableHierarchicalEndpointCodebook: false,
			},
		},
		medium: {
			webp: {
				quality: 87,
				alphaQuality: 75,
				reductionEffort: 6,
			},
			pngquant: {
				quality: [.7, .9],
				strip: true,
				speed: 3,
			},
			mozjpeg: {
				quality: 75,
				progressive: true,
			},
			gifsicle: {
				optimizationLevel: 2,
			},
			svgo: {
				floatPrecision: 3,
				plugins: [
					{
						name: 'removeViewBox',
						active: false,
					},
					{
						name: 'removeDimensions',
						active: true,
					},
				],
			},
			basis: {
				codec: 'ETC1S',
				forceAlpha: true,
				mipmaps: true,
				mipFilter: 'lanczos3',
				linear: true,
				compLevel: 2,
				yFlip: false,
				noEndpointRdo: true,
				noSelectorRdo: true,
				maxEndpoints: 16128,
				maxSelectors: 16128,
				normalMap: false,
				separateRgToColorAlpha: false,
				disableHierarchicalEndpointCodebook: false,

			},
		},
		high: {
			webp: {
				nearLossless: true,
				reductionEffort: 6,
			},
			pngquant: {
				quality: [.85, 1],
				strip: true,
				speed: 3,
			},
			mozjpeg: {
				quality: 90,
				progressive: true,
			},
			gifsicle: {
				optimizationLevel: 1,
			},
			svgo: {
				floatPrecision: 5,
				plugins: [
					{
						name: 'removeViewBox',
						active: false,
					},
					{
						name: 'removeDimensions',
						active: true,
					},
				],
			},
			basis: {
				codec: 'UASTC',
				forceAlpha: true,
				mipmaps: true,
				mipFilter: 'lanczos3',
				linear: true,
				uastcLevel: 3,
				uastcRdoQ: 1,
				yFlip: false,
				normalMap: false,
				separateRgToColorAlpha: false,
			},
		},
	},
	modes: {
		texture: {
			test: ( p ) => p.includes( 'texture' ),
			forcePowerOfTwo: true,
			emitBasis: true,
			qualityLevels: {
				medium: {
					pngquant: {
						quality: [.85, 1],
					},
				},
				high: {
					pngquant: {
						quality: [.95, 1],
					},
				},
			},
		},
		normalMap: {
			test: ( p ) => p.includes( 'normal' ),
			forcePowerOfTwo: true,
			emitBasis: true,
			defaultQualityLevel: 'high',
			qualityLevels: {
				low: {
					basis: {
						normalMap: true,
						separateRgToColorAlpha: true,
					},
				},
				medium: {
					basis: {
						normalMap: true,
						separateRgToColorAlpha: true,
					},
					pngquant: {
						quality: [.85, 1],
					},
				},
				high: {
					basis: {
						normalMap: true,
						separateRgToColorAlpha: true,
					},
					pngquant: {
						quality: [1, 1],
					},
				},
			},
		},
	},
};

export default defaultOptions;
