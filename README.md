# 🌄🧙🏼‍♀️ bismuth image loader
> Magical image loading for webpack! ✨


## Motivations

Dealing with images can be really messy, when you have to support multiple variants, formats and compression levels. `@bismuth/img-loader` attempts to solve this by doing all conversions, resizing and compressions automatically and on demand, when you import an image.

## Installation

```
yarn add --dev @bismuth/img-loader
```
```
npm i --save-dev @bismuth/img-loader
```

## Setup

You need to add the loader and its [cache management plugin](#caching) to your webpack config.


```typescript
import { CachePlugin } from '@bismuth/img-loader';


export default {
	module: {
		rules: [
			// ...
			{
				test: /\.(jpe?g|png)$/i,
				use: [{
					loader: '@bismuth/img-loader',
					options: {
						// ...
					},
				}],
			},
		],
	},
	plugins: [
		// ...
		new CachePlugin({
			// ...
		}),
	],
};


```
## Usage

Inside your project you can now import images like so: 

```typescript
import myImg from './img.png';

```
By default, `myImg` will give you the following object: 

```typescript
{
	src: 'path/to/compressed/img.png',
	webp: 'path/to/webp/img.webp',
	prefix: 'your/webpack/public/path/',
	width: 500, // source img pixel dimensions
	height: 500,
	alpha: true,
	thumbnail: {
		width: 4,
		height: 4,
		data: 'base64 encoded raw RGBA data',
	},
}

```


You can specify `quality` and `mode` by adding a query string:

```typescript
import myImg from './img.png?mode=texture&quality=high';

```

In this case you will get the same as above plus a `.basis` version:

```typescript
{
	// ...
	basis: 'path/to/basis/img.basis',
}

```


## Config

### General options

|Name|Type|Default|Description
|---|---|---|---|
|`name`|`string`|`'[name].[contenthash:6].[ext]'`|Specifies the output filename template.<br> Note, that `@bismuth/img-loader` may append an option hash for different renditions of the same input.
|`outputPath`|`string`|`''`|Specifies where the output files will be placed.
|`optionHashLength`|`number`|`4`|the length of the options-hash that may be appended to the output filename.
|`generateDeclarations`|`boolean`|`false`|whether to emit typescript declarations for all image imports. See [Typescript](#typescript)
|`skipCompression`|`boolean`|`false`| disables image compression/optimisation for PNG and JPEG outputs

### Image options
|Name|Type|Default|Description
|---|---|---|---|
`forcePowerOfTwo`|`boolean`|`false`|whether to force a power of 2 resolution. Note that `width` and `height` in the imported object will still contain the source images resolution.
`powerOfTwoStrategy`|`'upscale' \| 'downscale' \| 'nearest' \| 'area'`|`'area'`|how the power of 2 resolution is calculated. `upscale`, `downscale` and `nearest` should be self-descriptive. `area` rounds to the nearest power of 2 while attempting to match the source images area.
`emitWebp`|`boolean`|`true`| whether a WebP version should also be created.
`emitBasis`|`boolean`|`false`|  whether a basis version should also be created.
`thumbnail`|`false \| object`|[see below](#thumbnail)|either a config object ([see below](#thumbnail)) or `false` to disable.
`qualityLevels`|`Record<string, QualityLevel>`|[see default config](https://github.com/johh/bismuth-img-loader/blob/master/src/defaultOptions.ts)|an object of quality levels. See below.
`defaultQualityLevel`|`string`|`'medium'`| the quality level used if none is explicitly set
`modes`|`Record<string, Mode>`|[see default config](https://github.com/johh/bismuth-img-loader/blob/master/src/defaultOptions.ts)|an object of modes. See below.

### Quality levels

Quality levels give you granular control over how your images are compressed.

A quality level may be set by adding a `?quality=` query parameter to the import statement. If none is set, the `defaultQualityLevel` is chosen. 

If you override the default config, you must specify at least one quality level.

Each quality level object accepts the following properties:

|Name|Type|Description
|---|---|---|
`webp`|`object`|WebP compression options. See [sharp WebP output options](https://sharp.pixelplumbing.com/api-output#webp).|
`pngquant`|`object`|PNG compression options. See [imagemin-pngquant options](https://github.com/imagemin/imagemin-pngquant#options).|
`mozjpeg`|`object`|JPEG compression options. See [imagemin-mozjpeg options](https://github.com/imagemin/imagemin-mozjpeg#options).|
`basis`|`object`|Basis compression options. See [basis options below](#basis).|

### Modes
Modes let you selectively override **all** image options and quality levels. (the specified overrides will be merged into their respective targets)

They may be triggered by adding a `?mode=` query parameter to the import statement, or by a test function.

#### Example
Enable basis output and force power of 2 sizes for all images imported with `?mode=example` or with `'example'` in their path:

```typescript
{
	// ...
	modes: {
		example: {
			test: ( relativePath, absolutePath ) => relativePath.includes( 'example' ),
			emitBasis: true,
			forcePowerOfTwo: true,
		},
	},
}

```

### Thumbnail

`@bismuth/img-loader` can generate a tiny thumbnail that is synchronously available. 

|Name|Type|Default|Description
|---|---|---|---|
`width`|`number`|`4`| thumbnail width in pixels
`height`|`number`|`4`| thumbnail height in pixels
`format`|`'raw' \| 'png'`|`'raw'`| specifies the thumbnail data encoding format.<br>`'raw'` gives you the raw RGBA data as a base64 encoded string, while `'png'` outputs a data URL that you can use directly, e.g. as an `<img>` `src` 


### Default config

The default config can be found [here](https://github.com/johh/bismuth-img-loader/blob/master/src/defaultOptions.ts).

## Typescript
`@bismuth/img-loader` can auto-generate declarations for your image imports, based on your config!

By setting `generateDeclarations` to `true` in your config, `@bismuth/img-loader` will emit a file named `img-imports.d.ts` into your project root, containing declarations for every possible file extension, quality and mode combination. 

Naturally, this file can become quite large, depending on your config. To somewhat mitigate this, we assume that `mode` always comes before `quality` in any given query string. E.g. `*.png?mode=texture&quality=medium` is valid, `*.png?quality=medium&mode=texture` isn't.

To include the declarations in your TS setup, add this to your `tsconfig.json`:


```JSON
{
	"include": [
		"./img-imports.d.ts"
	]
}
```
This will also give you access to the `BismuthImage` type for your convenience.

## Caching

`@bismuth/img-loader` will cache all processed images and intermediates on disk. To manage the cache (e.g. to auto clear stale files) it provides a `CachePlugin` which accepts the following options:


|Name|Type|Default|Description
|---|---|---|---|
|`enabled`|`boolean`|`true`| an easy way to disable the plugin conditionally
|`cacheDir`|`string`|`'.img-loader-cache'`|specifies the cache directory
|`deleteUnusedFiles`|`boolean`|`true`|whether to auto delete unused cache files
|`aggressive`|`boolean`|`true`|toggles aggressive cache cleaning.<br>If true, the plugin will check for and delete stale files on every change.<br>This may be undesirable, for example when testing/comparing different quality renditions, since the assets will be rebuilt every time.<br>Disabling this option instructs the plugin to only check and clean once on startup.

## Pitfalls/Shortcomings

### Speed

Image conversion / compression can be slow, especially when working with `.basis` files on higher quality settings. Since webpack has to wait for the compression to complete, hot reloading will be blocked during that time. 

If things get too slow, you can temporarily limit the amount of processing that needs to be done, by setting `skipCompression` and  `emitWebp`/`emitBasis` conditionally. If you choose to do so, remember to also keep unused cache files by setting `deleteUnusedFiles`, otherwise already generated renditions may be deleted. Also, the renditions need to be generated at some point – You may inadvertently force that workload on your CI, if you forget to generate them locally.

I'm looking into ways to decouple the compression tasks from webpack, but this is still a ways away.

### Working with git / CI

Without an up to date cache, `@bismuth/img-loader` will create all necessary renditions on startup. This can lead to insanely long build- and startup times. To circumvent this, it may be desirable to push the entire cache directory to git LFS. While this is not ideal, all renditions will only be created once and reused on subsequent runs.

### Size

Don't forget to configure your CDN / server to deliver your `UASTC` `.basis` files with `gzip` or `brotli` compression! Their disk size is 4 bytes per pixel, so a 1024x1024 texture is 4MB uncompressed. This may also baloon your git LFS size, so be aware of that when using `UASTC` textures.

## Basis

`@bismuth/img-loader` ships with binaries of the [Basis Universal Supercompressed GPU Texture Codec](https://github.com/BinomialLLC/basis_universal) reference encoder.

Basis is a very complex topic in and of itself. `@bismuth/img-loader` exports a `BasisOptions` type to help you find an option combination that is valid.
Please refer to the [basis repo](https://github.com/BinomialLLC/basis_universal#readme) for info on the options.

A `basis` options object can have the following props:

|Name|Type|Codec|basisu equivalent / description|
|---|---|:-:|---|
`forceAlpha`|`boolean`||`-force_alpha`
`mipmaps`|`boolean`||`-mipmaps`
`mipFilter`|`string`||`-mip_filter filter`, defaults to `'lanczos3'`.<br>See [`BasisOptions.ts`](https://github.com/johh/bismuth-img-loader/blob/master/src/types/BasisOptions.ts) for all possible values.
`linear`|`boolean`||`-linear`, also sets `-mip_linear`
`yFlip`|`boolean`||`-y_flip`
`normalMap`|`boolean`||`-normal_map`
`separateRgToColorAlpha`|`boolean`||`-separate_rg_to_color_alpha`
`codec`|`'ETC1S' \| 'UASTC'`|| switches between both codec options.<br>Only options relevant for the active codec will be sent to basis.
`compLevel`|`number`|`ETC1S`|`-comp_level number`
`noEndpointRdo`|`boolean`|`ETC1S`|`-no_endpoint_rdo`
`noSelectorRdo`|`boolean`|`ETC1S`|`-no_selector_rdo`
`disableHierarchicalEndpointCodebook`|`boolean`|`ETC1S`|`-disable_hierarchical_endpoint_codebook`
`quality`|`number`|`ETC1S`|`-q number`, ignored if `maxEndpoints` or `maxSelectors` is set.
`maxEndpoints`|`number`|`ETC1S`|`-max_endpoints number`
`maxSelectors`|`number`|`ETC1S`|`-max_selectors number`
`uastcLevel`|`number`|`UASTC`|`-uastc_level number`
`uastcRdoQ`|`number`|`UASTC`|`-uastc_rdo_q number`

## To-dos
- [ ] support for generating multiple sizes
- [ ] webpack config validation
- [ ] async generation (not blocking webpack while images are being compressed)
- [x] better cache cleaning
- [ ] examples
- [ ] tests


## License

© 2021 the bismuth project authors, licensed under MIT.
