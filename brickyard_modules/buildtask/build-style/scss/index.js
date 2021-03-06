/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved */
const gulp = require('gulp')
const brickyard = require('brickyard')

gulp.create_tasks({
	/**
	 * 将 scss 代码转换成 css代码，
	 * debug 模式下文件内置 sourceMap todo:好像不起作用
	 */
	'build-style-scss': () => {
		// eslint-disable-next-line global-require
		const sass = require('gulp-sass')

		const styleConfig = brickyard.config.debug ? {
			errLogToConsole: true,
			outputStyle: 'nested',
			sourceComments: true,
			sourceMap: true,
			outFile: './',
		} : {
			outputStyle: 'compressed',
			sourceComments: false,
		}

		return gulp.src(`${brickyard.dirs.temp}/**/main.scss`, { base: brickyard.dirs.temp })
			.pipe(sass(styleConfig))
			.pipe(gulp.dest(brickyard.dirs.temp))
	},
})

gulp.register_sub_tasks('build', 22, 'build-style-scss')
