module.exports = (api) => {
	api.cache(true)
	return {
		ignore: ['**/testDirsAndFiles/**'],
		sourceMaps: true,
		presets: ['@babel/preset-env', '@babel/preset-typescript'],
		plugins: [
			['{{schema-plugin}}', {
				cwd: __dirname,
				destination: process.env.PWD
			}],
			'@babel/plugin-transform-runtime',
			[
				'@babel/plugin-proposal-decorators',
				{
					legacy: true,
				},
			],
			['@babel/plugin-proposal-class-properties', { loose: true }],
			[
				'module-resolver',
				{
					root: ['./'],
					alias: {
						'#spruce': './src/.spruce',
					},
				},
			],
		],
	}
}
