/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved */
const gulp = require('gulp')
const _ = require('lodash')
const brickyard = require('brickyard')
const path = require('path')

gulp.task('test_mocha', () => {
	let test_scripts = []
	_.each(brickyard.modules.backend, (plugin) => {
		const script = plugin.scripts && plugin.scripts.test

		if (!script) { return }
		if (!_.isEmpty(brickyard.argv.modules) && brickyard.argv.modules.indexOf(plugin.name) === -1) {
			return
		}

		let split = script.split(/\s+/)
		const cmd = split.shift() || ''
		if (cmd.toLowerCase().indexOf('mocha') === -1) { return }

		if (split.length === 0) {
			split = ['./test/*.js']
		}

		split = _.map(split, (p) => path.join(brickyard.dirs.modules, plugin.type, plugin.name, p))
		test_scripts = _.union(test_scripts, split)
	})

	console.log('run test', test_scripts)
	const main = path.join(brickyard.dirs.dest, 'index.js')
	return gulp.src(test_scripts, { read: false }).pipe(gulp.plugins.mocha({ require: [main] })).on('error', () => {}).pipe(gulp.plugins.exit())
})

gulp.register_sub_tasks('test', 0, 'test_mocha')
