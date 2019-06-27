const fs = require('fs')
const util = require('util')
/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved */
/* eslint-disable global-require, no-param-reassign */
const gulp = require('gulp')

const brickyard = require('brickyard')

gulp.create_tasks({
	'build-webpack': async () => {
		if (!fs.existsSync(brickyard.dirs.temp)) {
			return
		}

		const webpack = require('webpack')
		const HtmlWebpackPlugin = require('html-webpack-plugin')

		const alias = {}
		Object.keys(brickyard.modules.frontend).forEach((key) => {
			alias[key] = `${brickyard.dirs.tempModules}/${brickyard.modules.frontend[key].name}/`
		})

		const compiler = webpack({
			mode: brickyard.config.debug ? 'development' : 'production',
			entry: `${brickyard.dirs.tempModules}/main.js`,
			output: {
				path: `${brickyard.dirs.dest}/www`,
				filename: '[name].[chunkhash].js',
			},
			module: {
				rules: [
					{ test: /\.css$/, use: ['style-loader', 'css-loader'] },
					{ test: /\.(woff|woff2|eot|ttf|otf)$/, use: ['file-loader'] },
					{ test: /\.svg$/, use: ['svg-inline-loader'] },
					{ test: /\.(html)$/, use: ['html-loader'] },
					{ test: /\.js$/, exclude: /node_modules/, use: ['ng-annotate-loader'] },
				],
			},
			plugins: [
				new webpack.ProvidePlugin({
					$: 'jquery',
					jQuery: 'jquery',
				}),
				new HtmlWebpackPlugin({
					favicon: `${brickyard.dirs.dest}/www/favicon.ico`,
					template: `${brickyard.dirs.dest}/www/index.html`,
				}),
			],
			node: {
				__dirname: true,
				fs: 'empty',
			},
			resolve: {
				alias,
			},
		})

		const runAsync = util.promisify(compiler.run).bind(compiler)

		const stats = await runAsync()

		const info = stats.toJson()

		if (stats.hasErrors()) {
			console.error(info.errors)
		}

		if (stats.hasWarnings()) {
			console.warn(info.warnings)
		}
	},
})

gulp.register_sub_tasks('build', 30, 'build-webpack')
