# 🌄🧙🏼‍♀️ bismuth image loader
> Magical image loading for webpack! ✨


## Motivations

Dealing with images can be really messy, when you have to support multiple resolutions, formats and compression levels. `@bsmth/img-loader` attempts to solve this by doing all conversions, resizing and compressions automatically and on demand, when you import an image.

https://user-images.githubusercontent.com/5791070/120940715-e92e3d00-c71e-11eb-9ab9-a94815fce5fc.mp4

---

## Installation

```
yarn add --dev @bsmth/img-loader @bsmth/loader-cache
```
```
npm i --save-dev @bsmth/img-loader @bsmth/loader-cache
```

---

## Setup

You'll need to add the loader and its [cache management plugin](#caching) to your webpack config.


```typescript
import { CachePlugin } from "@bsmth/loader-cache";


export default {
	module: {
		rules: [
			// ...
			{
				test: /\.(jpe?g|png|gif|svg)$/i,
				use: [{
					loader: '@bsmth/img-loader',
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

---

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
	width: 500,
	height: 500,
	aspect: 1,	// aspect ratio of source image
	alpha: true,	// whether the image contains transparent areas
	thumbnail: {
		width: 4,
		height: 4,
		data: 'base64 encoded raw RGBA data',
	},
	sizes: {},
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

---

## Config

### General options

|Name|Type|Default|Description
|---|---|---|---|
|`name`|`string`|`'[name].[contenthash:6].[ext]'`|Specifies the output filename template.<br> Note, that `@bsmth/img-loader` may append an option hash for different renditions of the same input.
|`outputPath`|`string`|`''`|Specifies where the output files will be placed.
|`optionHashLength`|`number`|`4`|the length of the options-hash that may be appended to the output filename.
|`generateDeclarations`|`boolean`|`false`|whether to emit typescript declarations for all image imports. See [Typescript](#typescript)


### Image options
|Name|Type|Default|Description
|---|---|---|---|
`skipCompression`|`boolean`|`false`| disables image compression/optimisation for PNG, JPEG, SVG and GIF outputs
`forcePowerOfTwo`|`boolean`|`false`|whether to force a power of 2 resolution.
`powerOfTwoStrategy`|`'upscale' \| 'downscale' \| 'nearest' \| 'area'`|`'area'`|how the power of 2 resolution is calculated. `upscale`, `downscale` and `nearest` should be self-descriptive. `area` rounds to the nearest power of 2 while attempting to match the source images area.
`emitWebp`|`boolean`|`true`| whether a WebP version should also be created.
`emitBasis`|`boolean`|`false`|  whether a basis version should also be created.
`thumbnail`|`false \| object`|[see below](#thumbnail)|either a config object ([see below](#thumbnail)) or `false` to disable.
`qualityLevels`|`Record<string, QualityLevel>`|[see default config](https://github.com/project-bismuth/img-loader/blob/master/src/defaultOptions.ts)|an object of quality levels. See below.
`defaultQualityLevel`|`string`|`'medium'`| the quality level used if none is explicitly set
`modes`|`Record<string, Mode>`|[see default config](https://github.com/project-bismuth/img-loader/blob/master/src/defaultOptions.ts)|an object of modes. [See below.](#Modes)
`sizes`|`Record<string, Size>`|[see default config](https://github.com/project-bismuth/img-loader/blob/master/src/defaultOptions.ts)|an object of sizes. [See below](#Sizes).
`resizeKernel`|`'nearest' \| 'cubic' \| 'mitchell' \| 'lanczos2' \| 'lanczos3'`|`'lanczos3'`|the interpolation kernel used for downscaling

---

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
`gifsicle`|`object`|GIF compression options. See [imagemin-gifsicle options](https://github.com/imagemin/imagemin-gifsicle#options).|
`svgo`|`object`|SVG compression options. See [imagemin-svgo options](https://github.com/imagemin/imagemin-svgo#options).|
`basis`|`object`|Basis compression options. See [basis options below](#basis).|

---

### Modes
Modes let you selectively override **all** image options (including sizes) and quality levels. (the specified overrides will be merged into their respective targets)

They may be triggered by adding a `?mode=` query parameter to the import statement, or by a test function.

#### Example
Enable basis output and force power of 2 sizes for all images imported with `?mode=example` or with `'example'` in their path:

```typescript
// webpack loader options
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

---

### Sizes

Sizes let you generate multiple named resolutions of the same source image.

Configuring a size adds a corresponding set of additional exports to the `sizes` object of the image.

Each size object accepts the any combination of the following properties:

|Name|Type|Default|Description|
|---|---|---|---|
`scale`|`number` < 1|`1`| Dimension scalar. The dimensions of the original image are multiplied by this. 
`max`||`{ width: Infinity, height: Infinity }`| Dimension cap in pixels. All images will be downscaled to **at least** fit this resolution
`min`| |`{ width: 1, height: 1 }`| Minimum pixel dimensions an image may have after downscaling. Images originally smaller than this will not be upscaled.

Note that `forcePowerOfTwo` takes precedence over this, so depending on your `powerOfTwoStrategy` setting, you may get files that are larger or smaller than expected.

Scaling of GIFs and SVGs is not supported currently. The exports are still created, but they point to the full size image.

You can override the default behaviour (root `src`/`webp`/`basis` exports) by specifying a `default` size.

#### Example

Cap the size of all images at `4000px`×`3000px` and export an additional "mobile" size at half res, not downscaling below `300px`×`300px` but at least to `2000px`×`2000px`:

```typescript
// webpack loader options
{
	// ...
	sizes: {
		default: {
			max: {
				width: 4000,
				height: 3000,
			}
		},
		mobile: {
			scale: .5,
			min: {
				width: 300,
				height: 300,
			},
			max: {
				width: 2000,
				height: 2000,
			},
		},
	},
}

```

Given a `5000px`×`5000px` input image, output resolutions are the following: 

- `default`: `3000px`×`3000px`
- `mobile`: `2000px`×`2000px`

While a `500px`×`500px` input image yields:

- `default`: `500px`×`500px`
- `mobile`: `300px`×`300px`

Importing that image then gives you:

```typescript
{
	src: 'path/to/compressed/img.png',
	webp: 'path/to/webp/img.webp',
	prefix: 'your/webpack/public/path/',
	width: 500,
	height: 500,
	aspect: 1,
	alpha: true,
	thumbnail: {
		width: 4,
		height: 4,
		data: 'base64 encoded raw RGBA data',
	},
	sizes: {
		mobile: {
			width: 300,
			height: 300,
			src: 'path/to/mobile/img.png',
			webp: 'path/to/mobile/img.webp',
		},
	},
}

```

---

### Thumbnail

`@bsmth/img-loader` can generate a tiny thumbnail that is available synchronously.

|Name|Type|Default|Description
|---|---|---|---|
`width`|`number`|`4`| thumbnail width in pixels
`height`|`number`|`4`| thumbnail height in pixels
`format`|`'raw' \| 'png'`|`'raw'`| specifies the thumbnail data encoding format.<br>`'raw'` gives you the raw RGBA data as a base64 encoded string, while `'png'` outputs a data URL that you can use directly, e.g. as an `<img>` `src`

---

### Default config

The default config can be found [here](https://github.com/project-bismuth/img-loader/blob/master/src/defaultOptions.ts).

---

## Typescript
`@bsmth/img-loader` can auto-generate declarations for your image imports, based on your config!

By setting `generateDeclarations` to `true` in your config, `@bsmth/img-loader` will emit a file named `img-imports.d.ts` into your project root, containing declarations for every possible file extension, quality and mode combination.

Naturally, this file can become quite large, depending on your config. To somewhat mitigate this, we assume that `mode` always comes before `quality` in any given query string. E.g. `*.png?mode=texture&quality=medium` is valid, `*.png?quality=medium&mode=texture` isn't.

Note that only the `mode` set via a query parameter can be detected by Typescript. You may see inaccurate types for files where `mode` is set via a `test` function.

To include the declarations in your TS setup, add this to your `tsconfig.json`:


```JSON
{
	"include": [
		"./img-imports.d.ts"
	]
}
```
This will also give you access to the `BismuthImage` type for your convenience.

---

## Caching

`@bsmth/img-loader` will cache all processed images and intermediates on disk. This is handled by the `CachePlugin` exported by `@bsmth/loader-cache`, which [accepts some options](https://github.com/project-bismuth/loader-cache#options).

---

## Pitfalls/Shortcomings

### Speed

Image conversion / compression can be slow, especially when working with `.basis` files on higher quality settings. Since webpack has to wait for the compression to complete, hot reloading will be blocked during that time.

If things get too slow, you can temporarily limit the amount of processing that needs to be done, by setting `skipCompression` and  `emitWebp`/`emitBasis` conditionally. If you choose to do so, remember to also keep unused cache files by setting `deleteUnusedFiles`, otherwise already generated renditions may be deleted. Also, the renditions need to be generated at some point – You may inadvertently force that workload on your CI, if you forget to generate them locally.

I'm looking into ways to decouple the compression tasks from webpack, but this is still a ways away.

### Working with git / CI

Without an up to date cache, `@bsmth/img-loader` will create all necessary renditions on startup. This can lead to insanely long build- and startup times. To circumvent this, it may be desirable to push the entire cache directory (`.bsmth-loader-cache` by default) to git LFS. While this is not ideal, all renditions will only be created once and reused on subsequent runs.

### Size

Don't forget to configure your CDN / server to deliver your `UASTC` `.basis` files with `gzip` or `brotli` compression! Their disk size is 4 bytes per pixel, so a 1024x1024 texture is 4MB uncompressed. This may also baloon your git LFS size, so be aware of that when using `UASTC` textures.

---

## Basis

`@bsmth/img-loader` ships with binaries of the [Basis Universal Supercompressed GPU Texture Codec](https://github.com/BinomialLLC/basis_universal) reference encoder.

Basis is a very complex topic in and of itself. `@bsmth/img-loader` exports a `BasisOptions` type to help you find an option combination that is valid.
Please refer to the [basis repo](https://github.com/BinomialLLC/basis_universal#readme) for info on the options.

A `basis` options object can have the following props:

|Name|Type|Codec|basisu equivalent / description|
|---|---|:-:|---|
`forceAlpha`|`boolean`||`-force_alpha`
`mipmaps`|`boolean`||`-mipmaps`
`mipFilter`|`string`||`-mip_filter filter`, defaults to `'lanczos3'`.<br>See [`BasisOptions.ts`](https://github.com/project-bismuth/img-loader/blob/master/src/types/BasisOptions.ts) for all possible values.
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

---

## To-dos
- [x] better cache cleaning
- [x] support for generating multiple sizes
- [ ] webpack config validation
- [ ] better documentation
- [ ] async generation (not blocking webpack while images are being compressed)
- [ ] examples
- [ ] tests

---

## License

© 2021 the project bismuth authors, licensed under MIT.

This project uses the[ Basis Universal format and reference encoder](https://github.com/BinomialLLC/basis_universal) which is © 2021 Binomial LLC, licensed under Apache 2.0.
