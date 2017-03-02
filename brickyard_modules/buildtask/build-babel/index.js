const gulp = require('gulp')
const brickyard = require('brickyard')
const _ = require('lodash')

brickyard.ensureVersion('4.0.0-alpha')

let tasks = {
	/**
	 * 将项目后端代码里格式为 *.es6, *.es7的文件利用babel转换成 ES5 compatible
	 */
	babel_build_es6_7_backend: function () {
		let streams = []
		_.each(brickyard.modules.backend, (plugin, id) => {
			let path = []
			path.push(`${plugin.path}/**/*.{es6,es7}`)
			path.push('!plugins/**/node_modules/**')
			path.push('!plugins/**/bower_components/**')

			let stream = gulp.src(path)
				.pipe(gulp.plugins.babel({
					presets: ['latest', 'stage-2'],
					plugins: []
				}))
				.pipe(gulp.dest(`${brickyard.dirs.modules}/${plugin.type}/${id}`))

			streams.push(stream)
		})

		if (streams.length) {
			return gulp.merge(streams)
		}
	},
	/**
	 * 将项目前端代码里格式为 *.es6, *.es7的文件利用babel转换成 ES5 compatible
	 */
	babel_build_es6_7_frontend: function () {
		return gulp.src(`${brickyard.dirs.tempModules}/**/*.{es6,es7}`)
			.pipe(gulp.plugins.babel({
				presets: ['latest', 'stage-2'],
				plugins: []
			}))
			.pipe(gulp.dest(brickyard.dirs.tempModules))
	},
}

gulp.create_tasks(tasks)
gulp.register_sub_tasks('build', 11, 'babel_build_es6_7_backend') // just behind build-install
gulp.register_sub_tasks('build', 21, 'babel_build_es6_7_frontend') // just behind build-webpage

/**
 * 引入babel-polyfill以便 babel 能正确转译 es6/es7 的语法
 */
brickyard.events.once('before-run', () => require('babel-polyfill'))
