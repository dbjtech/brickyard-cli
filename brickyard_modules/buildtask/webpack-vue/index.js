const _ = require('lodash')
const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', (config) => {
	_.defaultsDeep(config, {
		module: { loaders: [] },
		vue: { loaders: {} },
		resolve: { extensions: ['', '.js'] },
	})
	config.resolve.extensions.push('.vue')
	config.module.loaders.push({
		test: /\.vue$/,
		loader: 'vue',
	})
	config.vue.loaders.js = 'babel?presets[]=latest&presets[]=stage-2'
	config.vue.loaders.scss = 'vue-style!css!sass'
	config.vue.loaders.sass = 'vue-style!css!sass?indentedSyntax'
})
