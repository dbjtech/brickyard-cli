const _ = require('lodash')
const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', (config) => {
	_.defaultsDeep(config, { module: { loaders: [] } })
	config.module.loaders.push({
		test: /\.js$/,
		loaders: ['babel?presets[]=es2015&presets[]=react&presets[]=react-native&presets[]=stage-1'],
	})
	config.resolve.alias['react-native'] = 'react-native-web'
	config.entry.unshift('babel-polyfill')
})
