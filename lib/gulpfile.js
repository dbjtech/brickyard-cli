const fs = require('fs')
const path = require('path')
const _ = require('lodash')
// const console = require('brickyard/private/logger')
const argv = require('brickyard/private/argv')
const brickyard = require('brickyard')
const gulp = require('gulp')
const mkdirp = require('mkdirp')

function setBackwardCompatibility() {
	brickyard.config.debug = argv.debug
	brickyard.argv = argv
}

gulp.task('default', (cb) => {
	let cmd = argv._[0]
	console.trace('argv:', JSON.stringify(argv))
	gulp.run_sequence(cmd, (err) => {
		if (err) {
			console.error(err.toString())
			cb(err)
		} else {
			console.log(`${cmd} task finish`)
			cb()
		}
	})
})

gulp.task('ls', () => {
	brickyard.scan(argv.brickyard_modules)
	if (!_.isEmpty(brickyard.allModules.unknow)) {
		console.warn('Unknow type modules found. It may be a declaration error.')
		_.each(brickyard.allModules.unknow, (md) => console.warn('\t', md.name))
	}
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
	brickyard.prepareModule()
	console.log(`${argv.plan.join(',')} modules`)
	for (let type of ['plan', 'buildtask', 'frontend', 'backend']) {
		let modules = _.values(brickyard.modules[type])
		if (modules.length) {
			console.log(`  ${type} modules:`)
			for (let md of modules) {
				console.log(`    ${md.name}`)
			}
		}
	}

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
	brickyard.loadBackendModules()
	gulp.run_flatten('run', cb)
})

gulp.task('create-module', () => {
	let candidates = ['frontend', 'backend', 'buildtask', 'plan']
	if (candidates.indexOf(argv.type) === -1) {
		throw new Error(`module type must be ${candidates}`)
	}
	let name = argv.name || path.basename(argv.dir)
	if (!/[\w-\d]*/.test(name)) {
		throw new Error(`${name} is not a valid module name`)
	}
	mkdirp.sync(argv.dir)
	let conf = getPackageJson(name, argv.type)
	fs.writeFileSync(path.join(argv.dir, 'package.json'), JSON.stringify(conf, null, 2))
	fs.writeFileSync(path.join(argv.dir, 'index.js'), '')
	console.log(`${argv.type} module ${name} created at ${argv.dir}`)
})

gulp.task('test', (cb) => gulp.run_sequence('build-start', () => gulp.run_flatten('test', cb)))

function start_debug_cluster(cb) {
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
			brickyard.loadBackendModules()
			gulp.run_flatten('run', cb)
		})
	}
}

function getPackageJson(name, type) {
	let rs = {}
	rs.name = name
	rs['brickyard-module-type'] = type
	rs.version = '0.0.1'
	rs.description = ''
	rs.main = 'index.js'
	rs.author = 'brickyard-developer'
	rs.license = 'ISC'
	return rs
}
