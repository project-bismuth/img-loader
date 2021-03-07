import ImgLoaderOptions from '../types/ImgLoaderOptions';


export default function getDefaultQuality( options: ImgLoaderOptions, mode: string ): string {
	if ( mode !== 'default' && 'defaultQualityLevel' in options.modes[mode]) {
		return options.modes[mode].defaultQualityLevel;
	}
	return options.defaultQualityLevel;
}
