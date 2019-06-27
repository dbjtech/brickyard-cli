/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved */
const path = require('path')
const gulp = require('gulp')
const brickyard = require('brickyard')

function buildEntry() {
	const template = require('gulp-template') // eslint-disable-line global-require

	return gulp.src(path.join(__dirname, 'main.js'))
		.pipe(template({ plugins: Object.keys(brickyard.modules.frontend) }))
		.pipe(gulp.dest(brickyard.dirs.tempModules))
}

function buildMisc() {
	return gulp.src(path.join(brickyard.config.misc, '*.*'))
		.pipe(gulp.dest(brickyard.dirs.www))
}

gulp.create_tasks({
	'build-misc': gulp.parallel(buildEntry, buildMisc),
})

gulp.register_sub_tasks('build', 24, 'build-misc')
