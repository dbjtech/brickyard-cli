'use strict'

const path = require('path')
const _ = require('lodash')
const brickyard = require('brickyard')

brickyard.events.on('build-webpack-config', function(config) {
	_.defaultsDeep(config, { module: { loaders: [] } })
	config.module.loaders.push({
		test: tester(/\.(png|ico|gif|jpg|jpeg|woff|woff2|ttf|eot|svg|wav)(\?.+)?$/i, brickyard.dirs.tempModules),
		loader: `url?context=${brickyard.dirs.tempModules}&name=[path][name].[hash:6].[ext]&limit=10000`,
	// },{
	// 	test: tester(/\.dtd$/, brickyard.dirs.tempModules),
	// 	loader: 'file?context=' + brickyard.dirs.tempModules + '&name=[path][name].[hash].[ext]',
	}, {
		test: tester(/\.(png|ico|gif|jpg|jpeg|woff|woff2|ttf|eot|svg)(\?.+)?$/i, /node_modules/),
		loader: 'url?name=[path][name].[hash:6].[ext]&limit=10000',
	// },{
	//	test: tester(/\.dtd$/, /node_modules/),
	//	loader: 'file?name=[path][name].[hash].[ext]',
	// },{
	// 	test: /\.(png|ico|gif|jpg|jpeg|woff|woff2|ttf|eot|svg)$/,
	// 	loader: 'url?name=[name].[hash].[ext]&limit=10000',
	// },{
	// 	test: /\.dtd$/,
	// 	loader: 'file?name=[name].[hash].[ext]',
	})
})

function tester(regex, include) {
	return (absPath) => {
		let pretest = true
		if ((include instanceof RegExp) && !include.test(absPath)) {
			pretest = false
		} else if (typeof(include) === 'string') {
			let full
			full = path.isAbsolute(include) ? path.normalize(include) : path.join(process.cwd(), include)
			pretest = absPath.indexOf(full) !== -1
		}
		return pretest && regex.test(absPath)
	}
}
