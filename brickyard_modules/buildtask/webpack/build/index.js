'use strict'

const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const gulp = require('gulp')
const glob = require('glob')
const brickyard = require('brickyard')

const www_dir = `${brickyard.dirs.dest}/www`

let configs = []
let alias = {}
let compiler

function join_cwd_if_relative(...p) {
	if (path.isAbsolute(p[0])) {
		return path.join(...p)
	}
	return path.join(process.cwd(), ...p)
}

let tasks = {
	build_entry: function() {
		alias['brickyard-plugins'] = join_cwd_if_relative(brickyard.dirs.tempModules, 'main.js')
		return gulp.src(path.join(__dirname, 'main.js'))
			.pipe(gulp.plugins.data(function() {
				let injection = {}
				_.each(brickyard.modules.frontend, function(plugin, key) {
					injection[key] = {
						id: key,
					}
				})
				return { plugins: injection }
			}))
			.pipe(gulp.plugins.template())
			.pipe(gulp.dest(brickyard.dirs.tempModules))
	},
	collect_plugin_configs: function() {
		let files = glob.sync(`${brickyard.dirs.tempModules}/**/*webpack-config.js`)
		console.debug('plugins webpack-configs', files)
		if (_.isEmpty(files)) {
			throw new Error('no webpack-config is scanned')
		}
		_.each(files, function(file) {
			configs.push(require(join_cwd_if_relative(file)))
		})
	},
	alias_config: function() {
		// brickyard plugin
		_.each(brickyard.modules.frontend, function(plugin, pid) {
			alias[pid] = join_cwd_if_relative(brickyard.dirs.tempModules, plugin.name, plugin.main)
			alias[`brickyard/${pid}`] = join_cwd_if_relative(brickyard.dirs.tempModules, plugin.name)
		})
		// bower
		let bower_conf = JSON.parse(fs.readFileSync(`${brickyard.dirs.dest}/bower.json`))
		let bower_plugins = brickyard.scanBowerModules()

		_.each(bower_plugins, function(plugin, pid) {
			if (bower_conf.dependencies[pid] && plugin.main) {
				try {
					require.resolve(pid)
				} catch (e) {
					console.debug(pid, 'is not in node_modules, use bower_components')
					alias[pid] = join_cwd_if_relative(plugin.mainDest || plugin.main)
				}
			}
		})
		// console.debug('webpack config alias', alias)
	},
	webpack_config: function() {
		const webpack = require('webpack')
		_.each(configs, function(config) {
			_.defaultsDeep(config, {
				// context: brickyard.dirs.tempModules,
				// bail: true,
				entry: [`${brickyard.dirs.tempModules}/main.js`],
				output: {
					path: www_dir,
					filename: '[name].[chunkhash:6].js',
					chunkFilename: '[name].[chunkhash:6].js',
				},
				resolve: {
					modulesDirectories: ['web_modules', 'node_modules'],
					alias: alias,
				},
				node: {
					__filename: true,
					__dirname: true,
					fs: 'empty',
				},
			})
			brickyard.events.emit('build-webpack-config', config)
			// config.plugins.push(new webpack.IgnorePlugin(/^templates$/))
			if (!brickyard.argv.debug) {
				config.plugins.push(new webpack.DefinePlugin({
					'process.env': {
						NODE_ENV: '"production"',
					},
				}))
				if (!brickyard.argv.noUglify) {
					config.plugins.push(new webpack.optimize.UglifyJsPlugin())
				}
			}
		})

		console.debug('webpack config:', JSON.stringify(configs, null, 4))
	},
	webpack_build_with_config: function(cb) {
		const webpack = require('webpack')
		compiler = webpack(configs)

		const outputOption = {
			// output options
			assets: true,
			colors: true,
			version: true,
			hash: true,
			timings: true,
			chunks: false
		}
		if (brickyard.argv.watch) {
			if (brickyard.modules.buildtask['webpack-dev-server']) {
				brickyard.events.emit('build-webpack-dev-server', compiler)
				cb()
				return
			}
			let callback = cb
			compiler.watch({
				poll: brickyard.argv.polling,
			}, function(err, stats) {
				if (err) throw err
				console.info('webpack watch', stats.toString(outputOption))
				if (callback) {
					callback()
					callback = null
				}
			})
		} else {
			compiler.run(function(err, stats) {
				if (err) throw err
				console.info('webpack build', stats.toString(outputOption))
				cb()
			})
		}
	},
	clean_webpack_frontend_temp: () => {
		const fse = require('fs-extra')
		if (!brickyard.argv.debug && !brickyard.argv.watch) {
			fse.removeSync(brickyard.dirs.temp)
		}
	},
}

gulp.create_tasks(tasks)
gulp.create_tasks({
	'webpack-build': (cb) => {
		if (compiler) {
			cb()
		} else {
			gulp.run_sequence('build_entry', 'collect_plugin_configs', 'alias_config', 'webpack_config', 'webpack_build_with_config', 'clean_webpack_frontend_temp', cb)
		}
	},
})

gulp.register_sub_tasks('build', 26, 'webpack-build')
