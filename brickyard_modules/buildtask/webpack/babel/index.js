const _ = require('lodash')
const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', (config) => {
	_.defaultsDeep(config, { module: { loaders: [] }, plugins: [] })
	const pconf = brickyard.config['buildtask-webpack-babel'] || { compileJS: false }
	const loader = {
		test: pconf.compileJS ? /\.(es6|es7|js)$/i : /\.(es6|es7)$/i,
		exclude: /(node_modules|bower_components)/,
		loaders: ['babel?presets[]=latest&presets[]=stage-2'],
	}
	if (brickyard.modules.buildtask['buildtask-webpack-ng-annotate']) {
		loader.loaders.unshift('ng-annotate')
	}
	config.module.loaders.push(loader)
	config.entry.unshift('babel-polyfill')
})
