import loaderUtils from 'loader-utils';
import path from 'path';

import type ImgLoaderOptions from '../types/ImgLoaderOptions';


interface DeriveFilenameProps {
	options: ImgLoaderOptions;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	loaderContext: any;
	source: Buffer;
}

export default function deriveOutputFilename({
	options,
	loaderContext,
	source,
}: DeriveFilenameProps ): {
		fileExt: string;
		fileNameBase: string;
	} {
	const interpolatedName = loaderUtils.interpolateName(
		loaderContext,
		options.name,
		{
			context: options.context || loaderContext.rootContext,
			content: source,
		},
	);

	const outputPath = ( 'outputPath' in options )
		? path.join( options.outputPath, interpolatedName )
		: interpolatedName;

	const temp = outputPath.split( '.' );
	const fileExt = temp.pop().toLowerCase();
	const fileNameBase = temp.join( '.' );

	return {
		fileExt,
		fileNameBase,
	};
}
