const _ = require('lodash')
const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', (config) => {
	_.defaultsDeep(config, {
		module: { loaders: [] },
	})
	config.resolve.extensions.push('.vue')

	const options = { loaders: {} }
	options.loaders.js = 'babel-loader?presets[]=env&presets[]=stage-2'
	options.loaders.scss = 'vue-style-loader!css-loader!sass-loader'
	options.loaders.sass = 'vue-style-loader!css-loader!sass-loader?indentedSyntax'

	config.module.loaders.push({
		test: /\.vue$/,
		loader: 'vue-loader',
		options,
	})
})
