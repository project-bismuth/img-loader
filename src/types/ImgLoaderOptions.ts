import type * as imageminMozjpeg from 'imagemin-mozjpeg';
import type * as imageminGifsicle from 'imagemin-gifsicle';
import type * as SVGO from 'svgo';
import type { WebpOptions } from 'sharp';
import type { Options as PngOptions } from 'imagemin-pngquant';
import type BasisOptions from './BasisOptions';


export type DeepPartial<T> = {
	[P in keyof T]?: DeepPartial<T[P]>;
};


type EmitConditionTest = ( path: string, absPath: string ) => boolean;


type ModeOptions = DeepPartial<Omit<ImgLoaderOptions, 'modes'>> & {
	test: EmitConditionTest;
};

interface ImgLoaderExportOptions {
	thumbnail: false | {
		width: number;
		height: number;
		format: 'raw' | 'png';
	};
	emitWebp: boolean;
	emitBasis: boolean;
	skipCompression: boolean;
	forcePowerOfTwo: boolean;
	powerOfTwoStrategy: 'upscale' | 'downscale' | 'nearest' | 'area';
}

export interface ImgLoaderQualityOptions {
	webp: WebpOptions;
	pngquant: PngOptions;
	mozjpeg: imageminMozjpeg.Options;
	basis: BasisOptions;
	gifsicle: imageminGifsicle.Options;
	svgo: SVGO.OptimizeOptions;
}

type ImgLoaderOptions = {
	name: string;
	outputPath: string;
	context?: string;
	optionHashLength: number;
	generateDeclarations: boolean;
	qualityLevels: Record<string, ImgLoaderQualityOptions>;
	defaultQualityLevel: string;
	modes: Record<string, ModeOptions>;
} & ImgLoaderExportOptions;

export default ImgLoaderOptions;


export type ImgLoaderInternalOptions = ImgLoaderQualityOptions & ImgLoaderExportOptions;
