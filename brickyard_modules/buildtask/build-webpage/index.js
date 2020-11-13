/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved, global-require */
const brickyard = require('brickyard')
const gulp = require('gulp')

const tempLibDir = `${brickyard.dirs.temp}/lib`

// atomic tasks
gulp.create_tasks({
	/**
	 * 将前端插件内对应的资源复制到临时目录
	 */
	build_frontend_plugins_temp: (cb) => {
		const mergeStream = require('merge-stream')

		const streams = Object.keys(brickyard.modules.frontend).map((id) => {
			const { path } = brickyard.modules.frontend[id]
			return gulp.src([
				`${path}/**/*.{js,es6,es7,json,md,html,css,scss,map,gif,jpg,jpeg,png,ico,svg,ttf,eot,woff,woff2,xsd,wsdl,mp3,wav}`,
				`!${path}/**/node_modules/**`,
				`!${path}/**/bower_components/**`,
				`!${path}/**/server/**`,
			]).pipe(gulp.dest(`${brickyard.dirs.tempModules}/${id}`))
		})

		if (streams.length) {
			return mergeStream(streams)
		}

		cb()
		return undefined
	},

	/**
	 * 清空临时目录
	 */
	clean_frontend_temp: async () => {
		const del = require('del')
		if (!brickyard.argv.debug && !brickyard.argv.watch) {
			del.sync([brickyard.dirs.temp, brickyard.dirs.bower])
		}
	},
})

// composed tasks
gulp.create_tasks({
	'build-webpage': (cb) => {
		gulp.run_sequence('build_frontend_plugins_temp', cb)
	},
})

// 21.build-babel, 22.build-style-scss, 23.build-style-minify, 24.build-misc
// 25.webpack-config, 26.webpack-build
gulp.register_sub_tasks('build', 20, 'build-webpage')
gulp.register_sub_tasks('build', 40, 'clean_frontend_temp')
