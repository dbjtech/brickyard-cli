const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', (config) => {
	const webpack = require('webpack')
	config.plugins.push(new webpack.optimize.CommonsChunkPlugin({
		name: 'app',
		minChunks: (md) => {
			// console.trace('webpack require', md.userRequest || md.rawRequest, count)
			if (typeof(md.userRequest) !== 'string') {
				return false
			}
			let isThirdParty = md.userRequest.indexOf('node_modules') !== -1 || md.userRequest.indexOf('bower_components') !== -1
			return !isThirdParty
		},
	}))
})
