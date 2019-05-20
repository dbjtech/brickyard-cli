const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const gulp = require('gulp')
const glob = require('glob')
const brickyard = require('brickyard')

const www_dir = `${brickyard.dirs.dest}/www`

const configs = []
const alias = {}
let compiler

function join_cwd_if_relative(...p) {
	if (path.isAbsolute(p[0])) {
		return path.join(...p)
	}
	return path.join(process.cwd(), ...p)
}

const tasks = {
	build_entry() {
		alias['brickyard-plugins'] = join_cwd_if_relative(brickyard.dirs.tempModules, 'main.js')
		return gulp.src(path.join(__dirname, 'main.js'))
			.pipe(gulp.plugins.data(() => {
				const injection = {}
				_.each(brickyard.modules.frontend, (plugin, key) => {
					injection[key] = {
						id: key,
					}
				})
				return { plugins: injection }
			}))
			.pipe(gulp.plugins.template())
			.pipe(gulp.dest(brickyard.dirs.tempModules))
	},

	async collect_plugin_configs() {
		const files = glob.sync(`${brickyard.dirs.tempModules}/**/*webpack-config.js`)
		console.debug('plugins webpack-configs', files)
		if (_.isEmpty(files)) {
			throw new Error('no webpack-config is scanned')
		}
		_.each(files, (file) => {
			configs.push(require(join_cwd_if_relative(file)))
		})
	},

	async alias_config() {
		// brickyard plugin
		_.each(brickyard.modules.frontend, (plugin, pid) => {
			const modulePath = join_cwd_if_relative(brickyard.dirs.tempModules, plugin.name, plugin.main)
			alias[pid] = modulePath
			alias[`brickyard/${pid}`] = modulePath
			alias[`brickyard\\${pid}`] = modulePath
			alias[`@brickyard/${pid}`] = modulePath
			alias[`@brickyard\\${pid}`] = modulePath
		})
		// bower
		const bower_conf = JSON.parse(fs.readFileSync(`${brickyard.dirs.dest}/bower.json`))
		const bower_plugins = brickyard.scanBowerModules()

		_.each(bower_plugins, (plugin, pid) => {
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

	async webpack_config() {
		const webpack = require('webpack')
		_.each(configs, (config) => {
			_.defaultsDeep(config, {
				// context: brickyard.dirs.tempModules,
				// bail: true,
				entry: [`${brickyard.dirs.tempModules}/main.js`],
				output: {
					path: www_dir,
					filename: 'lib/[name].[chunkhash:6].js',
				},
				resolve: {
					modules: ['web_modules', 'node_modules'],
					extensions: ['.js', '.json'],
					alias,
				},
				module: { loaders: [] },
				node: {
					__filename: true,
					__dirname: true,
					fs: 'empty',
				},
			})
			brickyard.events.emit('build-webpack-config', config)
			if (!brickyard.argv.debug) {
				config.plugins.push(new webpack.DefinePlugin({
					'process.env': {
						NODE_ENV: '"production"',
					},
				}))
				if (!brickyard.argv.noUglify) {
					config.plugins.push(new webpack.optimize.UglifyJsPlugin({
						comments: false,
					}))
				}
			}
		})

		console.debug('webpack config:', JSON.stringify(configs, null, 4))
	},

	webpack_build_with_config(cb) {
		const webpack = require('webpack')
		compiler = webpack(configs)

		const outputOption = {
			// output options
			assets: true,
			colors: true,
			version: true,
			hash: true,
			timings: true,
			chunks: false,
		}
		if (brickyard.argv.watch) {
			if (brickyard.modules.buildtask['webpack-dev-server']) {
				brickyard.events.emit('build-webpack-dev-server', compiler)
				cb()
				return
			}
			compiler.watch({
				poll: brickyard.argv.polling,
			}, (err, stats) => {
				if (err) {
					cb(err)
					return
				}
				console.info('webpack watch', stats.toString(outputOption))
				cb()
			})
		} else {
			compiler.run((err, stats) => {
				if (err) {
					cb(err)
					return
				}
				console.info('webpack build', stats.toString(outputOption))
				cb()
			})
		}
	},

	clean_webpack_frontend_temp: async () => {
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
