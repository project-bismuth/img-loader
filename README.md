# 🌄🧙🏼‍♀️ bismuth image loader
Magical image loading for webpack!

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
|`name`|`string`|<pre>`'[name].[contenthash:6].[ext]'`</pre>|Specifies the output filename template.<br> Note, that `@bismuth/img-loader` may append an option hash for different renditions of the same input.
|`outputPath`|`string`|`''`|Specifies where the output files will be placed.
|`optionHashLength`|`number`|`4`|the length of the options-hash that may be appended to the output filename.
|`generateDeclarations`|`boolean`|`false`|
|`skipCompression`|`boolean`|`false`|

### Image options
|Name|Type|Default|Description
|---|---|---|---|
`forcePowerOfTwo`|`boolean`|`false`|
`powerOfTwoStrategy`|`'upscale' | 'downscale' | 'nearest' | 'area'`|`'area'`|
`emitWebp`|`boolean`|`true`|
`emitBasis`|`boolean`|`false`|

### Quality levels

### Modes

## Default config

The default config can be found [here](#).

## Typescript
`@bismuth/img-loader` can auto-generate declarations for your image imports, based on your config!

By setting `generateDeclarations` to `true` in your config, `@bismuth/img-loader` will emit a file named `img-imports.d.ts` into your project root, containing declarations for every possible file extension, quality and mode combination. 

Naturally, this file can become quite large, depending on your config. To somewhat mitigate this, we assume that `mode` always comes before `quality` in any given query string. E.g. `*.png?mode=texture&quality=medium` is valid, `*.png?quality=medium&mode=texture` isn't.

To include the declarations in your TS setup, add this to your `tsconfig.json`:


```JSON
{
	...
	"include": [
		...
		"./img-imports.d.ts"
	]
}
```
This will also give you access to the `BismuthImage` type for your convenience.

## Caching

`@bismuth/img-loader` will cache all processed images and intermediates on disk. To manage the cache (e.g. auto clear stale files) it provides a `CachePlugin` which accepts the following options:


|Name|Type|Default|Description
|---|---|---|---|
|`enabled`|`boolean`|`true`| an easy way to disable the plugin conditionally
|`cacheDir`|`string`|<pre>`'.img-loader-cache'`</pre>|specifies the cache directory
|`deleteUnusedFiles`|`boolean`|`true`|whether to auto delete unused cache files
|`aggressive`|`boolean`|`true`|toggles aggressive cache cleaning.<br>If true, the plugin will check for and delete stale files on every change.<br>This may be undesirable, for example when testing/comparing different quality renditions, since the assets will be rebuilt every time.<br>Disabling this option instructs the plugin to only check and clean once on startup.

## Pitfalls/Shortcomings

## Basis

## To-dos
- [ ] support for generating multiple sizes
- [ ] webpack config validation
- [ ] async generation (not blocking webpack while images are being compressed)
- [x] better cache cleaning
- [ ] tests


## License

© 2021 the bismuth project authors, licensed under MIT.
