const _ = require('lodash')
const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', (config) => {
	const pconf = brickyard.config['buildtask-webpack-ng-annotate']
	_.defaultsDeep(config, { module: { loaders: [] }, plugins: [] })
	if (pconf && pconf.disable) {
		return
	}
	config.module.loaders.push({
		test: /\.controller\.js$/i,
		exclude: /(node_modules|bower_components)/,
		loader: 'ng-annotate-loader',
	})
})
