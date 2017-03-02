const _ = require('lodash')
const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', (config) => {
	_.defaultsDeep(config, { module: { loaders: [] }, plugins: [], resolve: { extensions: ['', '.js'] } })
	config.resolve.extensions.push('.jsx')
	config.module.loaders.push({
		test: /\.jsx$/,
		loaders: [`babel?presets[]=es2015&presets[]=react`],
	})
})
