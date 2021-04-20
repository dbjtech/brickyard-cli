/* eslint-disable global-require */
const fs = require('fs')
const util = require('util')
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

		const webpackConfig = {
			mode: brickyard.config.debug ? 'development' : 'production',
			entry: `${brickyard.dirs.tempModules}/main.js`,
			output: {
				path: `${brickyard.dirs.dest}/www`,
				filename: '[name].js',
			},
			module: {
				rules: [
					{ test: /\.(woff|woff2|eot|ttf|otf)$/, use: ['file-loader'] },
					{ test: /\.svg$/, use: ['svg-inline-loader'] },
					{ test: /\.(html)$/, use: ['html-loader'] },
					{ test: /\.css$/, use: ['style-loader', 'css-loader'] },
					{ test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
					{ test: /\.(png|jpg|jpeg|gif)$/i, use: ['url-loader'] },
					{ test: /\.js$/, exclude: /node_modules/, use: ['ng-annotate-loader'] },
					{
						test: /\.js$/,
						exclude: /node_modules/,
						use: {
							loader: 'babel-loader',
							options: {
								presets: ['@babel/preset-env'],
							},
						},
					},
					{ test: require.resolve('jquery'), use: ['expose-loader?jQuery'] },
					{ test: require.resolve('angular'), use: ['imports-loader?jQuery=jquery'] },
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
		}
		process.emit('build-webpack-config', webpackConfig)
		const compiler = webpack(webpackConfig)

		const runAsync = util.promisify(compiler.run).bind(compiler)

		const stats = await runAsync()

		const info = stats.toJson()

		if (stats.hasErrors()) {
			info.errors.map((e) => console.error(e))
			throw new Error('webpack build error')
		}

		if (stats.hasWarnings()) {
			info.warnings.map((e) => console.warn(e))
		}
	},
})

gulp.register_sub_tasks('build', 30, 'build-webpack')
