const _ = require('lodash')
const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', (config) => {
	_.defaultsDeep(config, { module: { loaders: [] }, plugins: [], resolve: { extensions: ['', '.js'] } })
	config.resolve.extensions.push('.ts', '.tsx')
	config.module.loaders.push({
		test: /\.ts$/,
		loaders: [`awesome-typescript?configFileName=${__dirname}/tsconfig.json`, 'angular2-template'],
	}, {
		test: /\.html$/,
		loader: 'html?minimize=false',
	}, {
		test: /\.component\.css$/,
		loader: 'raw',
	})
})
