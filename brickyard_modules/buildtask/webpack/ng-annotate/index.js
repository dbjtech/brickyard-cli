'use strict'

const _ = require('lodash')
const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', function(config) {
	let pconf = brickyard.config['buildtask-webpack-ng-annotate']
	_.defaultsDeep(config, { module: { loaders: [] }, plugins: [] })
	if (pconf && pconf.disable) {
		return
	}
	config.module.loaders.push({
		test: /\.js$/i,
		exclude: /(node_modules|bower_components)/,
		loader: 'ng-annotate',
	})
})
