'use strict'

const _ = require('lodash')
const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', function(config) {
	_.defaultsDeep(config, { module: { loaders: [] }, plugins: [] })
	config.module.loaders.push({
		test: /\.json$/i,
		loader: 'json',
	})
})
