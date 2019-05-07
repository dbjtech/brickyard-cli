/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved, global-require */
const gulp = require('gulp')
const brickyard = require('brickyard')

brickyard.ensureVersion('4.0.0-alpha')

const tasks = {
	/**
	 * 将项目后端代码里格式为 *.es6, *.es7的文件利用babel转换成 ES5 compatible
	 */
	babel_build_es6_7_backend: () => {
		const mergeStream = require('merge-stream')

		return mergeStream(Object.keys(brickyard.modules.backend).map((id) => {
			const plugin = brickyard.modules.backend[id]
			return gulp
				.src([
					`${plugin.path}/**/*.{es6,es7}`,
					'!plugins/**/node_modules/**',
					'!plugins/**/bower_components/**',
				])
				.pipe(gulp.plugins.babel({
					presets: ['env', 'stage-2'],
					plugins: [],
				}))
				.pipe(gulp.dest(`${brickyard.dirs.modules}/${plugin.type}/${id}`))
		}))
	},
	/**
	 * 将项目前端代码里格式为 *.es6, *.es7的文件利用babel转换成 ES5 compatible
	 */
	babel_build_es6_7_frontend: () => {
		const babel = require('gulp-babel')

		return gulp
			.src(`${brickyard.dirs.tempModules}/**/*.{es6,es7}`)
			.pipe(babel({
				presets: ['@babel/preset-env'],
				plugins: [],
			}))
			.pipe(gulp.dest(brickyard.dirs.tempModules))
	},
}

gulp.create_tasks(tasks)
gulp.register_sub_tasks('build', 11, 'babel_build_es6_7_backend') // just behind build-install
gulp.register_sub_tasks('build', 21, 'babel_build_es6_7_frontend') // just behind build-webpage
