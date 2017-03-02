'use strict'

const _ = require('lodash')
const brickyard = require('brickyard')
const exts = [
	'.dynamic.scss',
	'.scss',
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
	let etp = new ExtractTextPlugin('style-scss.[contenthash:6].css')

	_.defaultsDeep(config, { module: { loaders: [] }, plugins: [] })
	config.module.loaders.push({
		test: tester(exts[0]),
		loader: 'style/useable!css!sass',
	})
	config.module.loaders.push({
		test: tester(exts[1]),
		loader: etp.extract('css!resolve-url!sass?sourceMap')
	})
	config.plugins.push(etp)
})
