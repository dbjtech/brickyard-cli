/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved, global-require */
const gulp = require('gulp')
const brickyard = require('brickyard')

gulp.create_tasks({
	/**
	 * 给所有的css代码自动添加浏览器前缀
	 */
	add_css_autoprefixer() {
		const autoprefixer = require('gulp-autoprefixer')

		return gulp.src(`${brickyard.dirs.temp}/**/*.css`, { base: brickyard.dirs.temp })
			.pipe(autoprefixer('last 10 version', '> 1%', 'ie 9'))
			.pipe(gulp.dest(brickyard.dirs.temp))
	},

	/**
	 * 压缩 css 文件
	 */
	minify_css(cb) {
		const cleanCss = require('gulp-clean-css')

		if (brickyard.config.debug) {
			cb()
			return undefined
		}

		return gulp.src([`${brickyard.dirs.temp}/**/*.css`, `!${brickyard.dirs.temp}/lib/**`])
			.pipe(cleanCss({
				// root: brickyard.dirs.temp,
				debug: brickyard.config.debug,
				compatibility: 'ie9',
			}))
			.pipe(gulp.dest(brickyard.dirs.temp))
	},

})

// composed tasks
gulp.create_tasks({
	'build-style-minify': (cb) => {
		gulp.run_sequence('add_css_autoprefixer', 'minify_css', cb)
	},
})


gulp.register_sub_tasks('build', 23, 'build-style-minify')
