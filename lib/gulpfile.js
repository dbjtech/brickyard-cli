const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const gulp = require('gulp')
const mkdirp = require('mkdirp')
const Bluebird = require('bluebird')
const cluster = require('cluster')

const argv = require('../bin')
const brickyard = require('./brickyard')
const logger = require('./logger')

logger.setLevel(argv.verbose)
logger.hackConsole()

require('./hack')

const runSequence = Bluebird.promisify(require('run-sequence'))

const runFlatten = gulp.runFlatten

function setBackwardCompatibility() {
	brickyard.config.debug = argv.debug
	brickyard.argv = argv
}

function listModule(container) {
	let maxLength = _.maxBy(_.keys(container), 'length')
	maxLength = maxLength ? maxLength.length + 2 : 0
	maxLength = Math.max(maxLength, 20)
	const content = []
	_.each(container, (md) => {
		const printName = _.padEnd(`[${md.name}]`, maxLength, ' ')
		const printDesc = md.description || ''
		content.push(`    ${printName}    ${printDesc}`)
	})
	return content
}

function startDebugCluster() {
	if (cluster.isMaster) {
		const worker = cluster.fork()
		worker.once('message', (msg) => {
			if (msg === 'debug-build-finished') {
				// 由于master进程没有经过build流程，所以需要从头构建brickyard运行环境
				argv.dir = argv.output
				runSequence('run-start').then(() => runFlatten('watch'))
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
		return Bluebird.resolve()
	}
	return runSequence('build-start').then(() => {
		if (brickyard.modules.buildtask['buildtask-watch']) {
			process.send('debug-build-finished')
		}
		brickyard.loadBackendModules()
		return runFlatten('run')
	}).catch(() => {
		process.exit(1)
	})
}

gulp.task('default', () => {
	const cmd = argv._[0]
	console.trace('argv:', JSON.stringify(argv))
	return runSequence(cmd).then(() => {
		console.trace(`${cmd} task finish`)
	})
})

gulp.task('ls', () => Bluebird.coroutine(function* g() {
	yield brickyard.scanAsync(argv.brickyard_modules)
	if (!_.isEmpty(brickyard.allModules.unknow)) {
		console.warn('Unknow type modules found. It may be a declaration error.')
		listModule(brickyard.allModules.unknow).forEach((str) => { console.warn(str) })
	}

	// ls plan
	if (_.isEmpty(argv.plan)) {
		console.log('plan modules:')
		listModule(brickyard.allModules.plan).forEach((str) => { console.log(str) })
		return
	}

	// ls modules of plans
	brickyard.preparePlanSync(argv.plan)
	console.log(`${argv.plan.join(',')} modules`)
	_.forEach(['plan', 'buildtask', 'frontend', 'backend'], (type) => {
		const modules = brickyard.modules[type]
		if (!_.isEmpty(modules)) {
			console.log(`  ${type} modules:`)
			listModule(modules).forEach((str) => { console.log(str) })
		}
	})
})())

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

gulp.task('del', () => gulp.del([
	`${brickyard.dirs.modules}/**`,
	`${brickyard.dirs.tempModules}/**`,
]))

/*
 * runtime tasks copy to brickyard.dirs.modules,
 * frontend tasks copy to brickyard.dirs.tempModules
 */
gulp.task('copy-modules-to-build-dir', () => {
	const streams = []

	_.each(brickyard.modules, (md) => {
		const paths = []
		paths.push(`${md.path}/**`)
		let stream
		if (['buildtask', 'backend', 'plan'].indexOf(md.type) !== -1) {
			stream = gulp.src(paths).pipe(gulp.dest(path.join(brickyard.dirs.modules, md.type, md.name)))
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

gulp.task('build-start', () => runSequence('scan-and-prepare', 'del', 'copy-modules-to-build-dir', 'build-config', 'load-buildtasks')
	.then(() => runFlatten('build')))

gulp.task('build', () => (argv.debug ? startDebugCluster() : runSequence('build-start')))

gulp.task('run-start', () => {
	brickyard.scan(path.join(argv.dir, 'brickyard_modules'))
	const plans = _.keys(brickyard.allModules.plan)
	console.log('running', plans.join(','))
	brickyard.preparePlan(plans)
	brickyard.setBuildPath(argv.dir)
	setBackwardCompatibility()

	const config = path.join(brickyard.dirs.dest, 'config.js')
	console.log('using brickyard config', config)
	fs.accessSync(config)
	brickyard.setConfig(config)

	brickyard.prepareModuleRuntime()
	if (!brickyard.isBuilt()) {
		throw new Error(`brickyard app ${plans} was not well built`)
	}

	brickyard.loadBuildTasks()
})

gulp.task('run', ['run-start'], () => {
	brickyard.loadBackendModules()
	return runFlatten('run')
})

gulp.task('create-module', () => {
	const candidates = ['frontend', 'backend', 'buildtask', 'plan']
	if (candidates.indexOf(argv.type) === -1) {
		throw new Error(`module type must be ${candidates}`)
	}
	const name = argv.name || path.basename(argv.dir)
	if (!/[\w-\d]*/.test(name)) {
		throw new Error(`${name} is not a valid module name`)
	}
	mkdirp.sync(argv.dir)
	const conf = {
		name,
		'brickyard-module-type': argv.type,
		version: '0.0.1',
		description: `${argv.type} for ${name}`,
		main: 'index.js',
		author: 'brickyard-developer',
		license: 'ISC',
	}
	fs.writeFileSync(path.join(argv.dir, 'package.json'), `${JSON.stringify(conf, null, 2)}\n`)
	fs.writeFileSync(path.join(argv.dir, 'index.js'), '')
	console.log(`${argv.type} module ${name} created at ${argv.dir}`)
})

gulp.task('test', () => runSequence('build-start').then(runFlatten('test')))
