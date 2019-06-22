/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved */
const fs = require('fs')
const path = require('path')
const gulp = require('gulp')
const brickyard = require('brickyard')

gulp.create_tasks({

	build_entry: () => {
		const template = require('gulp-template') // eslint-disable-line global-require

		return gulp.src(path.join(__dirname, 'main.js'))
			.pipe(template({ plugins: Object.keys(brickyard.modules.frontend) }))
			.pipe(gulp.dest(brickyard.dirs.tempModules))
	},

	build_misc_template_html: (cb) => {
		const mergeStream = require('merge-stream') // eslint-disable-line global-require
		const rename = require('gulp-rename') // eslint-disable-line global-require
		const replace = require('gulp-replace') // eslint-disable-line global-require
		const template = brickyard.config.misc && brickyard.config.misc.template

		if (!(Object.keys(template).length > 0)) {
			cb()
			return null
		}

		const streams = Object.keys(template).map((dest) => {
			const task = template[dest]
			console.debug(dest, task)
			let p = gulp.src(task.template)

			if (brickyard.config.debug) {
				p = p.pipe(gulp.plugins.replace(/<!-- livereload -->/,
					`<script>
						var host = (location.host||'localhost').split(':')[0]
						document.write('<script src="http://'+host+':35729/livereload.js">'+'</'+'script>')
					</script>`))
			}

			if (task['index-page']) {
				const indexContent = fs.readFileSync(path.join(brickyard.dirs.tempModules, task['index-page']))
				p = p.pipe(gulp.plugins.replace(/<!-- index-page -->/, indexContent))
			}

			p.pipe(replace(/<!-- APP_DEBUG_MODE -->/g, brickyard.config.debug || ''))
				.pipe(replace(/<!-- WEBSERVER -->/, brickyard.argv.webserver || ''))
				.pipe(replace(/<!-- content -->/, task.content))
				.pipe(rename(dest))
				.pipe(gulp.dest(brickyard.dirs.www))

			return p
		})

		return mergeStream(streams)
	},

	build_misc_other: (cb) => {
		const mergeStream = require('merge-stream') // eslint-disable-line global-require
		const others = brickyard.config.misc && brickyard.config.misc.others

		if (!(Object.keys(others).length > 0)) {
			cb()
			return null
		}

		const streams = Object.keys(others).map((dest) => {
			const p = gulp
				.src(others[dest])
				.pipe(gulp.dest(path.join(brickyard.dirs.dest, dest)))
			return p
		})

		return mergeStream(streams)
	},
})

gulp.create_tasks({
	'build-misc': (cb) => {
		gulp.run_sequence('build_entry', 'build_misc_template_html', 'build_misc_other', cb)
	},
})

gulp.register_sub_tasks('build', 24, 'build-misc')
