'use strict'

const _ = require('lodash')
const brickyard = require('brickyard')
const exts = [
	'.component.css',
	'.dynamic.css',
	'.css',
]

function tester(ext) {
	return (absPath) => {
		for (let i = 0; i < exts.length; i++) {
			if (absPath.toLowerCase().endsWith(exts[i])) {
				return exts[i] === ext
			}
		}
		return false
	}
}

brickyard.events.on('build-webpack-config', function(config) {
	const ExtractTextPlugin = require('extract-text-webpack-plugin')
	let etp = new ExtractTextPlugin('lib/style-css.[contenthash:6].css')

	_.defaultsDeep(config, { module: { loaders: [] }, plugins: [] })
	config.module.loaders.push({
		test: tester(exts[0]),
		loader: 'do-nothing-loader',
	})
	config.module.loaders.push({
		test: tester(exts[1]),
		loader: 'style-loader/useable!css-loader',
	})
	config.module.loaders.push({
		test: tester(exts[2]),
		loader: etp.extract('css-loader'),
	})
	config.plugins.push(etp)
})
