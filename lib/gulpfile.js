const Bluebird = require('bluebird')
const _ = require('lodash')
const gulp = require('gulp')
const cluster = require('cluster')
const runSequence = Bluebird.promisify(require('run-sequence'))

const argv = require('../bin')
const brickyard = require('./brickyard')

require('./hack')

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

function requireBrickyard() {
	brickyard.argv = argv
	brickyard.debug = argv.debug
	brickyard.config.debug = argv.debug
	module.require_alias('brickyard', brickyard)
	module.require_alias('brickyard/config', brickyard.config)
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

	yield brickyard.saveAsync(dir, config)

	brickyard.prepareDependencies()

	brickyard.hackDependencies()

	requireBrickyard()

	brickyard.loadModules('buildtask')

	yield runFlatten('build')
})())

gulp.task('run-core', () => Bluebird.coroutine(function* g() {
	const { dir } = argv

	yield brickyard.loadAsync(dir)

	brickyard.hackDependencies()

	requireBrickyard()

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
