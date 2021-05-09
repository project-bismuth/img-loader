import type {
	ImgLoaderInternalOptions,
	ImgLoaderSizeOptions,
} from '../types/ImgLoaderOptions';
import getPowerOfTwoSize from './getPowerOfTwoSize';


interface GetSizeProps {
	width: number;
	height: number;
	sizeOpts: ImgLoaderSizeOptions;
	options: ImgLoaderInternalOptions;
}

export default function getSize({
	width: originalWidth,
	height: originalHeight,
	sizeOpts,
	options,
}: GetSizeProps ): [number, number] {
	const minimum = Math.max(
		sizeOpts.min.width / originalWidth,
		sizeOpts.min.height / originalHeight,
	);
	const scale = Math.min(
		1, // ensure that there's no upscaling
		Math.max(
			minimum,
			Math.min(
				sizeOpts.max.width / originalWidth,
				sizeOpts.max.height / originalHeight,
				sizeOpts.scale,
			),
		),
	);

	return options.forcePowerOfTwo
		? getPowerOfTwoSize(
			originalWidth * scale,
			originalHeight * scale,
			options.powerOfTwoStrategy,
		)
		: [
			Math.round( originalWidth * scale ),
			Math.round( originalHeight * scale ),
		];
}
