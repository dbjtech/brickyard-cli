const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const argv = require('brickyard/argv')
const brickyard = require('./brickyard')
const gulp = require('gulp')
const glob = require('glob')

function setBackwardCompatibility() {
	brickyard.config.debug = argv.debug
	brickyard.build_dir = brickyard.dirs.dest
	brickyard.argv = argv
	brickyard.glob_sync = glob.sync
	brickyard.backend_plugins = brickyard.modules.backend
	brickyard.frontend_plugins = brickyard.modules.frontend
}

gulp.task('default', () => {
	let cmd = argv._[0]
	console.trace('argv:', JSON.stringify(argv))
	gulp.start(cmd)
})

gulp.task('ls', () => {
	brickyard.scan(argv.brickyard_modules)
	// ls
	if (_.isEmpty(argv.plan)) {
		console.log('plan modules:')
		_.each(brickyard.allModules.plan, (plan) => {
			console.log('\t', plan.name)
		})
		return
	}
	// ls plans
	brickyard.preparePlan(argv.plan)
	brickyard.setBuildPath(argv.output)
	console.log(argv.plan, 'modules:')
	_.each(['plan', 'buildtask', 'frontend', 'backend'], (type) => {
		let modules = _.values(brickyard.modules[type])
		if (modules.length) {
			console.log('  ', type, 'modules:')
			_.each(brickyard.modules[type], (md) => {
				console.log('    ', md.name)
			})
		}
	})

	if (brickyard.isBuilt()) {
		let msg = (argv.plan instanceof Array && argv.plan.length > 1) ?
			`${argv.plan.join(',')} were built. Try Brickyard run.` :
			`${argv.plan} was built. Try Brickyard run.`
		console.log(msg)
	}
})

gulp.task('build-config', () => {
	console.log('using brickyard config', argv.config)
	fs.accessSync(argv.config)
	brickyard.setConfig(argv.config)
	brickyard.dumpConfig()
})

gulp.task('scan-and-prepare', () => {
	brickyard.scan(argv.brickyard_modules)
	brickyard.preparePlan(argv.plan)
	brickyard.setBuildPath(argv.output)
	brickyard.prepareModule()
	setBackwardCompatibility()
})

gulp.task('del', (cb) => {
	gulp.del([
		`${brickyard.dirs.modules}/**`,
		`${brickyard.dirs.tempModules}/**`,
	]).then(() => {
		cb()
	})
})

/* runtime tasks copy to brickyard.dirs.modules, frontend tasks copy to brickyard.dirs.tempModules */
gulp.task('copy-modules-to-build-dir', () => {
	let streams = []

	_.each(brickyard.modules, (md) => {
		let paths = []
		// console.trace(`${md.path}/**`, 'to', path.join(brickyard.dirs.dest, 'brickyard_modules', md.name))
		paths.push(`${md.path}/**`)
		let stream
		if (['buildtask', 'backend', 'plan'].indexOf(md.type) !== -1) {
			stream = gulp.src(paths).pipe(gulp.dest(path.join(brickyard.dirs.modules, md.name)))
		} else if (md.type === 'frontend') {
			stream = gulp.src(paths).pipe(gulp.dest(path.join(brickyard.dirs.tempModules, md.name)))
		}
		streams.push(stream)
	})

	return streams.length ? gulp.merge(streams) : null
})

gulp.task('load-buildtasks', () => {
	brickyard.loadBuildTasks()
})

gulp.task('build-start', (cb) => {
	gulp.run_sequence('scan-and-prepare', 'del', 'copy-modules-to-build-dir', 'build-config', 'load-buildtasks', (err) =>
		(err ? cb(err) : gulp.run_flatten('build', cb))
	)
})

gulp.task('build-restart', (cb) => {
	gulp.run_sequence('copy-modules-to-build-dir', 'load-buildtasks', (err) =>
		(err ? cb(err) : gulp.run_flatten('build', cb))
	)
})

gulp.task('build', (cb) =>
	(argv.debug ? start_debug_cluster(cb) : gulp.run_sequence('build-start', cb))
)

gulp.task('run', (cb) => {
	brickyard.scan(path.join(argv.dir, 'brickyard_modules'))
	let plans = _.keys(brickyard.allModules.plan)
	console.log('running', plans.join(','))
	brickyard.preparePlan(plans)
	brickyard.setBuildPath(argv.dir)
	setBackwardCompatibility()

	let config = path.join(brickyard.dirs.dest, 'config.js')
	console.log('using brickyard config', config)
	fs.accessSync(config)
	brickyard.setConfig(config)

	brickyard.prepareModuleRuntime()
	if (!brickyard.isBuilt()) {
		throw new Error(`brickyard app ${plans} was not well built`)
	}

	brickyard.loadBuildTasks()

	gulp.run_flatten('run', cb)
})

gulp.task('test', (cb) => gulp.run_sequence('build-start', () => gulp.run_flatten('test', cb)))

function start_debug_cluster(cb) {
	const gulp_load_plugins = require('gulp-load-plugins')
	const cluster = require('cluster')
	if (cluster.isMaster) {
		let watching = false
		let worker = cluster.fork()
		// receive msg from worker
		worker.on('message', (msg) => {
			// console.log('receive msg', msg)
			if (msg !== 'debug-build-finished') { return }
			if (watching) {
				console.log('already watching')
			} else {
				// 由于master进程没有经过build流程，所以需要从头构建brickyard运行环境
				gulp.run_sequence('run', (err) => {
					if (err) { throw err }
					gulp.plugins = gulp_load_plugins({ config: brickyard.config })
					// brickyard.config.debug = brickyard_debug
					gulp.run_flatten('watch', cb)
					watching = true
				})
			}
		})
		cluster.on('exit', (child, code, signal) => {
			if (code !== 0) {
				console.log(`Worker ${child.id} exited with ${signal || code}. Exiting...`)
				process.exit(code)
			}
			console.log(`Worker ${child.id} exited with ${signal || code}. Restarting...`)
			cluster.fork()
		})
	} else {
		gulp.run_sequence('build-start', (err) => {
			if (err) { process.exit(1) }
			if (brickyard.modules.backend['gulp-task-watch']) {
				process.send('debug-build-finished')
			}
			gulp.run_flatten('run', cb)
		})
	}
}
