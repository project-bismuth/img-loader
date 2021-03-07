export type MipFilterOptions = 'box' | 'tent'| 'bell' | 'b-spline' | 'mitchell'| 'blackman' |
'lanczos3' | 'lanczos4' | 'lanczos6' | 'lanczos12' | 'kaiser' | 'gaussian' | 'catmullrom' |
'quadratic_interp' | 'quadratic_approx' | 'quadratic_mix';


interface BasisGeneralOptions {
	forceAlpha: boolean;
	mipmaps: boolean;
	mipFilter: MipFilterOptions;
	linear: boolean;
	yFlip: boolean;
	normalMap: boolean;
	separateRgToColorAlpha: boolean;
}

interface BasisUastcOptions {
	codec: 'UASTC';
	uastcLevel: number;
	uastcRdoQ: number;
}

interface BasisEtc1sOptions {
	codec: 'ETC1S';
	compLevel: number;
	disableHierarchicalEndpointCodebook: boolean;
	noSelectorRdo: boolean;
	noEndpointRdo: boolean;
}

type BasisEtc1sAutoOptions = {
	quality: number;
} & BasisEtc1sOptions;


type BasisEtc1sManualOptions = {
	maxEndpoints: number;
	maxSelectors: number;
} & BasisEtc1sOptions;


type BasisOptions =
	( BasisGeneralOptions & BasisUastcOptions )
	| ( BasisGeneralOptions & ( BasisEtc1sAutoOptions | BasisEtc1sManualOptions ) );


export default BasisOptions;
