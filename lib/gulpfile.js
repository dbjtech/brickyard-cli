const Bluebird = require('bluebird')
const path = require('path')
const _ = require('lodash')
const gulp = require('gulp')
const cluster = require('cluster')
const del = require('del')

const argv = require('../bin')
const brickyard = require('./brickyard')

require('./hack')

const runSequence = Bluebird.promisify(require('run-sequence'))

const runFlatten = gulp.runFlatten

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

gulp.task('default', () => runSequence(argv._[0]))

gulp.task('init', () => Bluebird.coroutine(function* g() {
	const { brickyard_modules, plan } = argv

	yield brickyard.scanAsync(brickyard_modules)

	if (!_.isEmpty(plan)) {
		brickyard.preparePlan(plan)
	}
})())

gulp.task('ls', ['init'], () => {
	const plan = { argv }

	if (!_.isEmpty(brickyard.allModules.unknow)) {
		console.warn('Unknow type modules found. It may be a declaration error.')
		listModule(brickyard.allModules.unknow).forEach((str) => { console.warn(str) })
	}

	// list plan
	if (_.isEmpty(plan)) {
		console.log('plan modules:')
		listModule(brickyard.allModules.plan).forEach((str) => { console.log(str) })
		return
	}

	// list modules of plans
	console.log(`${plan.join(',')} modules`)
	_.forEach(['plan', 'buildtask', 'frontend', 'backend'], (type) => {
		const modules = brickyard.modules[type]
		if (!_.isEmpty(modules)) {
			console.log(`  ${type} modules:`)
			listModule(modules).forEach((str) => { console.log(str) })
		}
	})
})

gulp.task('build', ['init'], () => Bluebird.coroutine(function* g() {
	const { dir, config } = argv

	brickyard.setBuildPath(dir)

	yield del([
		`${brickyard.dirs.modules}/**`,
		`${brickyard.dirs.tempModules}/**`,
	])

	const streams = []

	const copyModules = (modulePath, ...pathName) => new Bluebird((resolve, reject) => {
		gulp.src([`${modulePath}/**`])
			.pipe(gulp.dest(path.join(...pathName)))
			.on('end', (err) => {
				(err ? reject : resolve)(err)
			})
	})
	_.each(brickyard.modules, (md) => {
		if (['buildtask', 'backend', 'plan'].indexOf(md.type) !== -1) {
			streams.push(copyModules(md.path, brickyard.dirs.modules, md.type, md.name))
		} else if (md.type === 'frontend') {
			streams.push(copyModules(md.path, brickyard.dirs.tempModules, md.name))
		}
	})

	yield Bluebird.all(streams)

	yield brickyard.buildConfigAsync(config)

	brickyard.prepareDependencies()

	brickyard.hackDependencies()

	brickyard.loadModules('buildtask')

	yield runFlatten('build')
})())

gulp.task('run-core', () => Bluebird.coroutine(function* g() {
	const { dir } = argv

	yield brickyard.scanAsync(path.join(dir, 'brickyard_modules'))
	const plans = _.keys(brickyard.allModules.plan)
	brickyard.preparePlan(plans)

	brickyard.setBuildPath(dir)

	yield brickyard.setConfigAsync(path.join(dir, 'config.js'))

	brickyard.hackDependencies()

	brickyard.loadModules('buildtask', 'backend')

	yield runFlatten('run')
})())

gulp.task('run', () => Bluebird.coroutine(function* g() {
	const { instances } = argv
	const CLUSTER_RUN_FINISHED = 1

	if (cluster.isMaster) {
		const workerFinished = []
		for (let i = 0; i < instances; i += 1) {
			workerFinished.push(new Bluebird((resolve) => {
				cluster.fork().on('message', (msg) => {
					if (msg === CLUSTER_RUN_FINISHED) {
						resolve()
					}
				})
			}))
		}
		yield Bluebird.all(workerFinished)
		return
	}

	yield runSequence('run-core')

	process.send(CLUSTER_RUN_FINISHED)
})())

gulp.task('debug', () => Bluebird.coroutine(function* g() {
	if (cluster.isMaster) {
		yield runSequence('build')
	}
	yield runSequence('run')
	if (cluster.isMaster) {
		yield runFlatten('watch')
	}
})())
