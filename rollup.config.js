import typescript from 'rollup-plugin-typescript2';
import propertiesRenameTransformer from 'ts-transformer-properties-rename';
import { terser } from 'rollup-plugin-terser';


export default {
	input: './src/index.ts',

	output: [
		{
			dir: 'dist/esm',
			format: 'esm',
		},
		{
			dir: 'dist/cjs',
			format: 'cjs',
		},
	],

	plugins: [
		terser({
			format: {
				comments: false,
			},
			mangle: {
				properties: {
					regex: /^_private_/,
				},
			},
		}),
		typescript({
			tsconfigOverride: {
				compilerOptions: {
					module: 'esnext',
				},
			},
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			transformers: [( service ) => ({
				before: [
					propertiesRenameTransformer(
						service.getProgram(),
						{
							privatePrefix: '_private_',
							internalPrefix: '',
							entrySourceFiles: ['./src/index.ts'],
						},
					),
				],
				after: [],
			})],
		}),
	],
};
