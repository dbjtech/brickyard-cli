/* eslint-disable global-require, import/no-extraneous-dependencies */
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const gulp = require('gulp')
const brickyard = require('brickyard')
const jsonEditor = require('gulp-json-editor')

brickyard.ensureVersion('4.6.0')
const packageJson = path.join(brickyard.dirs.dest, 'package.json')
const fakeModulesPath = path.join(brickyard.dirs.dest, 'node_modules')

const tasks = {
	build_pkg: (cb) => {
		gulp.run_sequence('build_fake_modules', 'build_pkg_package_json', 'build_pkg_execute', 'clean_fake_modules', cb)
	},

	build_fake_modules: async () => {
		const mkdirp = require('mkdirp')
		for (const dir of _.keys(module.require_alias_cache)) {
			if (/^@?brickyard/.test(dir)) {
				const fullPath = path.join(fakeModulesPath, dir)
				mkdirp.sync(fullPath)
				fs.writeFileSync(path.join(fullPath, 'index.js'), `throw new Error('do not directly require ${dir}')\n`)
			}
		}
	},

	build_pkg_package_json: () => gulp.src(packageJson)
		.pipe(jsonEditor({
			license: undefined,
			pkg: {
				scripts: ['*.js', 'brickyard_modules/**/*'],
				assets: ['www/**/*'],
			},
		}))
		.pipe(gulp.dest(brickyard.dirs.dest)),

	build_pkg_execute: (cb) => {
		const { exec } = require('pkg')
		const args = [packageJson, '--target', 'host', '--out-path', brickyard.dirs.dest]
		if (brickyard.debug) {
			args.push('--debug')
		}
		exec(args).then(cb).catch(cb)
	},

	clean_fake_modules: async () => {
		const del = require('del')
		del.sync([path.join(fakeModulesPath, 'brickyard'), path.join(fakeModulesPath, '@brickyard')])
	},
}

gulp.create_tasks(tasks)
gulp.register_sub_tasks('build', 50, 'build_pkg') // after clean
