const _ = require('lodash')
const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', (config) => {
	_.defaultsDeep(config, { module: { loaders: [] }, plugins: [] })
	config.resolve.extensions.push('.ts', '.tsx')
	config.module.loaders.push({
		test: /\.ts$/,
		loaders: [`awesome-typescript-loader?configFileName=${__dirname}/tsconfig.json`, 'angular2-template-loader', 'angular-router-loader'],
		// loaders: ['@ngtools/webpack/src/loader.js', 'angular-router'],
	}, {
		test: /\.html$/,
		loader: 'html-loader?minimize=false',
	}, {
		test: /\.component\.css$/,
		loader: 'raw-loader',
	})
})
