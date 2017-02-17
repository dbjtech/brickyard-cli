const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const childProcess = require('child_process')
const Bluebird = require('bluebird')
const _ = require('lodash')
const gulp = require('gulp')

const argv = require('../bin')
const brickyard = require('./brickyard')

require('./hack')

const runFlatten = gulp.runFlatten
const runSequence = Bluebird.promisify(require('run-sequence'))

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

gulp.task('default', () => runSequence(argv._[0]).catch(e => console.error(e.message || e)))

gulp.task('init', () => (async () => {
	const { brickyard_modules, plan } = argv

	await brickyard.scanAsync(brickyard_modules)

	if (!_.isEmpty(plan)) {
		brickyard.preparePlan(plan)
	}
})())

gulp.task('ls', ['init'], () => {
	const { plan } = argv

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

gulp.task('build', ['init'], (() => async () => {
	const { dir, config } = argv

	await brickyard.saveAsync(dir, config)
	brickyard.prepareDependencies()
	brickyard.hackDependencies()
	requireBrickyard()
	brickyard.loadModules('buildtask')
	await runFlatten('build')
})())

gulp.task('run-core', (() => async () => {
	const { dir } = argv

	await brickyard.loadAsync(dir)
	brickyard.hackDependencies()
	requireBrickyard()
	brickyard.loadModules('buildtask', 'backend')
	await runFlatten('run')
})())

gulp.task('run', (() => async () => {
	const { instances } = argv
	if (isNaN(instances) || typeof instances !== 'number' || instances <= 0) {
		throw new Error(`Invalid instances value: ${instances}`)
	}
	const BRICKYARD_CHILD_PROCESS_FLAG = '--brickyard-child-process-flag'
	const BRICKYARD_CHILD_PROCESS_RUN_FINISHED = 'brickyard-child-process-run-finished'
	const isMaster = process.argv.indexOf(BRICKYARD_CHILD_PROCESS_FLAG) === -1

	if (isMaster) {
		const workerFinished = []
		for (let i = 0; i < instances; i += 1) {
			const md = process.argv[1]
			const param = _.concat(_.drop(process.argv, 2), BRICKYARD_CHILD_PROCESS_FLAG)
			const handle = childProcess.fork(md, param)

			console.debug(`Process[${process.pid}] fork Process[${handle.pid}] with cmd:`)
			console.debug(`${md} ${param.join(' ')} ${process.execArgv.join(' ')}`)
			workerFinished.push(new Promise((resolve) => {
				handle.once('message', (msg) => {
					if (msg === BRICKYARD_CHILD_PROCESS_RUN_FINISHED) {
						resolve()
					}
				})
			}))
		}
		await Promise.all(workerFinished)
	} else {
		await runSequence('run-core')
		process.send(BRICKYARD_CHILD_PROCESS_RUN_FINISHED)
	}
})())

function getPackageJson(name, type) {
	const rs = {}
	rs.name = name
	rs['brickyard-module-type'] = type
	rs.version = '0.0.1'
	rs.description = `${type} for ${name}`
	rs.main = 'index.js'
	rs.author = 'brickyard-developer'
	rs.license = 'ISC'
	return rs
}

gulp.task('create-module', (() => async () => {
	const { type, dir } = argv

	const candidates = ['frontend', 'backend', 'buildtask', 'plan']
	if (candidates.indexOf(type) === -1) {
		throw new Error(`module type must be ${candidates}`)
	}
	const name = argv.name || path.basename(argv.dir)
	if (!/[\w-\d]*/.test(name)) {
		throw new Error(`${name} is not a valid module name`)
	}
	mkdirp.sync(dir)
	const conf = getPackageJson(name, type)
	const confContent = `${JSON.stringify(conf, null, 2)}\n`
	fs.writeFileSync(path.join(dir, 'package.json'), confContent)
	fs.writeFileSync(path.join(dir, 'index.js'), '')
	console.log(`${type} module ${name} created at ${dir}`)
})())
