const _ = require('lodash')
const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', (config) => {
	_.defaultsDeep(config, {
		module: { loaders: [] },
		vue: { loaders: {} },
	})
	config.resolve.extensions.push('.vue')
	config.module.loaders.push({
		test: /\.vue$/,
		loader: 'vue-loader',
	})
	config.vue.loaders.js = 'babel-loader?presets[]=env&presets[]=stage-2'
	config.vue.loaders.scss = 'vue-style-loader!css!sass'
	config.vue.loaders.sass = 'vue-style-loader!css!sass?indentedSyntax'
})
