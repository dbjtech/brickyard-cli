const fs = require('fs')
const _ = require('lodash')
const brickyard = require('brickyard')
const path = require('path')

const base = brickyard.dirs.bower

brickyard.events.on('build-webpack-config', (config) => {
	_.defaultsDeep(config, { module: { loaders: [] } })
	const npm_config = JSON.parse(fs.readFileSync(`${brickyard.dirs.dest}/package.json`))
	const dependencies = _.extend(npm_config.dependencies, npm_config.devDependencies)
	// console.log(dependencies)
	if (dependencies.jquery) {
		config.module.loaders.push({
			test: require.resolve('jquery'),
			loader: 'expose-loader?jQuery!expose-loader?$',
		})
	}
	if (dependencies.bootstrap && dependencies.jquery) {
		config.module.loaders.push({
			test: require.resolve('bootstrap'),
			loader: 'imports-loader?jQuery=jquery',
		})
	}
	if (dependencies.angular && dependencies.jquery) {
		// 这里的作用是生成以下代码
		// var jQuery = require('jquery')
		// require(angular)
		// module.exports = angular
		// 作用是：
		// 1. 加载angular前加载jquery，这样不用用户手动引入jquery
		// 2. 把全局的angular对象作为模块的返回，否则外部调用var angular=require('angular');会出问题
		config.module.loaders.push({
			test: require.resolve('angular'),
			loader: 'imports-loader?jQuery=jquery',
		})
	}
	if (dependencies.ztree_v3) {
		// eslint-disable-next-line no-param-reassign
		config.resolve.alias.ztree_v3 = path.join(base, 'ztree_v3/js/jquery.ztree.all.js')
	}
	if (dependencies.wowjs) {
		config.module.loaders.push({
			test: require.resolve('wowjs'),
			loader: 'expose-loader?WOW!exports-loader?this.WOW',
		})
	}
	if (dependencies.respond) {
		config.module.loaders.push({
			test: path.join(base, 'respond', 'dest', 'respond.src.js'),
			loader: 'imports-loader?this=>window',
		})
	}
})
