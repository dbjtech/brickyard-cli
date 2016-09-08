const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const glob = require('glob')
const minimatch = require('minimatch')
const events = require('events')
const console = require('../logger')
const semver = require('semver')

class BrickyardModules {
	constructor(_package_json) {
		// handle package.json
		let package_json = path.isAbsolute(_package_json) ?
			_package_json :
			path.join(process.cwd(), _package_json)
		let config = require(package_json)
		this.config = config
		this.name = config.name
		this.path = path.dirname(package_json)
		this.description = config.description
		this.devDependencies = config.devDependencies || {}
		this.dependencies = config.dependencies || {}

		if (config.main instanceof Array) {
			config.main = _.filter(config.main, (e) => e.match(/\.js$/))[0]
		}
		if (config.main) {
			this.main = config.main
			this.mainSrc = path.join(this.path, config.main)
			this.mainDest = path.join(this.name, config.main)
		}

		if (['buildtask', 'backend', 'frontend', 'plan'].indexOf(config['brickyard-module-type']) !== -1) {
			this.type = config['brickyard-module-type']
		} else if (/^buildtask/i.test(config.description)) {
			this.type = 'buildtask'
		} else if (/^backend/i.test(config.description)) {
			this.type = 'backend'
		} else if (/^frontend/i.test(config.description)) {
			this.type = 'frontend'
		} else if (/^plan/i.test(config.description)) {
			this.type = 'plan'
		} else {
			this.type = 'unknow'
		}
		// handle bower.json if existed
		try {
			let bower_json = path.join(this.path, 'bower.json')
			fs.accessSync(bower_json)
			// console.trace('scanned bower.json', path.join(this.path, 'bower.json'))
			let bower_config = require(bower_json)
			this.bowerDependencies = bower_config.dependencies || {}
		} catch (e) {}
	}
}

function alias(dependencies) {
	let exceptions = []// ['gulp-load-plugins']
	for (let key of _.keys(dependencies)) {
		if (exceptions.indexOf(key) === -1) {
			// console.trace('alias', key)
			let md = require(key)
			module.require_alias(key, md)
		}
	}
}

function alias_brickyard_module(base, md) {
	if (['backend', 'buildtask'].indexOf(md.type) === -1) { return }
	let mainDestFullPath = `${path.join(base, md.name)}`
	module.require_alias(`brickyard/${md.name}`, mainDestFullPath)
	module.require_alias(`brickyard/${md.name}/src`, md.mainSrc)
	console.trace('alias brickyard module', md.name)
}

function multi_glob_sync(...pattens) {
	let rs = []
	for (let patten of pattens) {
		if (patten[0] !== '!') {
			rs = _.union(rs, glob.sync(patten))
		} else {
			rs = _.difference(rs, glob.sync(patten.substring(1)))
		}
	}
	return rs
}

function try_to_require(name) {
	try {
		require(`brickyard/${name}`)
		console.debug(`load ${name} [success]`)
	} catch (err) {
		console.error(`load ${name} [failed]`)
		throw err
	}
}

class Brickyard {
	constructor() {
		this.allModules = []
		this.allModules.frontend = {}
		this.allModules.backend = {}
		this.allModules.plan = {}
		this.allModules.buildtask = {}
		this.allModules.unknow = {}

		this.modules = []
		this.modules.frontend = {}
		this.modules.backend = {}
		this.modules.plan = {}
		this.modules.buildtask = {}
		this.expectModules = []

		this.config = {}

		this.npm = {}
		this.bower = {}
		this.bower.dependencies = {}
		this.packageJson = require(path.join(__dirname, '../../', 'package.json'))
		this.npm.dependencies = _.clone(this.packageJson.dependencies)
		this.npm.devDependencies = {}// _.clone(this.packageJson.devDependencies)

		this.version = this.packageJson.version
		this.events = new events.EventEmitter()
	}
	/*
	 * ensure brickyard-cli version is greater than the param
	 */
	ensureVersion(requiredVersion) {
		if (semver.gt(requiredVersion, this.version)) {
			throw new Error(`brickyard_modules require brickyard-cli@${requiredVersion} and current version is ${this.version}`)
		}
	}
	/*
	 * scan and parse all modules of the _paths, put them into this.allModules
	 * return modules count
	 */
	scan(..._paths) {
		let paths = _.flatten(_paths)
		if (paths.length === 0) {
			paths = ['brickyard_modules']
		}
		paths = _.map(paths, (p) => (path.isAbsolute(p) ? p : path.join(process.cwd(), p)))
		this.modulePaths = (paths.length === 1) ? paths[0] : `{${paths.join(',')}}`
		let files = multi_glob_sync(
			`${this.modulePaths}/**/package.json`,
			`!${this.modulePaths}/**/node_modules/**/package.json`
		)
		for (let file of files) {
			let md = new BrickyardModules(file)
			if (md.type !== 'unknow') {
				this.allModules.push(md)
			}
			this.allModules[md.type][md.name] = md
			console.trace('scanned', md.type, 'module', md.name)
		}
		return files.length
	}
	/*
	 * scan bower components in this.dirs.bower
	 * MUST call after setBuildPath()
	 */
	scanBowerModules() {
		let rs = {}
		let files = glob.sync(`${this.dirs.bower}/*/bower.json`)
		for (let file of files) {
			let md = new BrickyardModules(file)
			md.type = 'bower'
			if (md.mainDest && !path.isAbsolute(md.mainDest)) {
				md.mainDest = path.join(this.dirs.bower, md.mainDest)
			}
			rs[md.name] = md
			console.trace('scanned', md.type, 'module', md.name)
		}
		return rs
	}
	/*
	 * 1. find the modules matching the plans' declaration, put them into this.modules and this.modules.plan
	 * 2. set this.config base on plans
	 * MUST call after scan
	 */
	preparePlan(..._plans) {
		if (!_.isEmpty(this.modules.plan)) {
			throw new Error('multiple preparing plans are not allow')
		}
		let plans = _.flatten(_plans)
		console.trace('preparing', plans.join(','))
		for (let name of plans) {
			let md = this.allModules.plan[name]
			if (!md) {
				throw new Error(`Plan module ${name} not found`)
			}
			this.modules.push(md)
			this.modules[md.type][md.name] = md

			let plan = require(md.mainSrc)
			if (!plan.modules) {
				throw new Error(`Plan module ${name} modules not found`)
			}
			_.extend(this.config, plan.config)
			this.expectModules.push(...plan.modules)
		}
	}
	/*
	 * 1. put plans' expectModules into this.modules (sort by declaration)
	 * 2. alias require('brickyard/[module.name]') to module.mainDest and module.mainSrc
	 * 3. set this.npm.dependencies and this.bower.dependencies
	 * MUST call after preparePlan() and setBuildPath()
	 */
	prepareModule() {
		let enable = md => {
			if (this.modules[md.type][md.name]) {
				return
				// throw new Error(`Name conflict: ${md.type} modules ${md.name}`)
			}
			this.modules.push(md)
			this.modules[md.type][md.name] = md
			alias_brickyard_module(this.dirs.modules, md)
		}
		// 1, 2
		for (let rule of this.expectModules) {
			if (typeof(rule) === 'string') {
				rule = { type: 'path', pattern: rule }
			}
			for (let md of this.allModules) {
				if (rule.type === 'path') {
					let pattern1 = `${this.modulePaths}/${rule.pattern}`
					let pattern2 = `${this.modulePaths}/${rule.pattern}/**`
					// console.trace(md.path, pattern1, minimatch(md.path, pattern1), minimatch(md.path, pattern2))
					if (minimatch(md.path, pattern1) || minimatch(md.path, pattern2)) {
						enable(md)
					}
				} else if (rule.type === 'name') {
					if (rule.pattern instanceof RegExp) {
						if (rule.pattern.test(md.name)) {
							enable(md)
						}
					} else {
						if (md.name === rule.pattern) {
							enable(md)
						}
					}
				}
			}
		}
		// 3
		for (let md of this.modules) {
			_.extend(this.npm.dependencies, md.dependencies)
			_.extend(this.npm.devDependencies, md.devDependencies)
			_.extend(this.bower.dependencies, md.bowerDependencies)
		}
	}
	/*
	 * Init this.modules according to config. for brickyard run only
	 * MUST call after setConfig()
	 */
	prepareModuleRuntime() {
		if (_.isEmpty(this.config.modules)) {
			throw new Error('The config is not for runtime')
		}
		for (let expectModule of this.config.modules) {
			let md = this.allModules.backend[expectModule] || this.allModules.buildtask[expectModule]
			if (!md) {
				throw new Error(`${expectModule} not found`)
			}
			this.modules.push(md)
			this.modules[md.type][md.name] = md
			alias_brickyard_module(this.dirs.modules, md)
		}
	}
	/*
	 * indicate brickyard where to place the build files
	 */
	setBuildPath(_dest) {
		if (!_dest) {
			throw new Error('wrong build path')
		}
		this.dirs = {}

		let dest
		if (!path.isAbsolute(_dest)) {
			dest = path.join(process.cwd(), _dest)
		}

		this.dirs.dest = dest
		this.dirs.temp = path.join(dest, 'temp')
		this.dirs.tempModules = path.join(dest, 'temp', 'plugins')
		this.dirs.modules = path.join(dest, 'brickyard_modules')
		this.dirs.www = path.join(dest, 'www')
		this.dirs.bower = path.join(dest, 'bower_components')
	}
	/*
	 * require all buildtask modules
	 * MUST call after prepare()
	 * param fromSrc: whether to load md.mainSrc. default is false, load from md.mainDest
	 */
	loadBuildTasks() {
		alias(this.packageJson.dependencies)
		_.each(this.modules.buildtask, (md) => {
			try_to_require(md.name)
		})
	}
	/*
	 * require all backend modules
	 * MUST call after prepareModuleRuntime()
	 * param fromSrc: whether to load md.mainSrc. default is false, load from md.mainDest
	 */
	loadBackendModules() {
		_.each(this.modules.backend, (md) => {
			try_to_require(md.name)
		})
	}
	/*
	 * get the package.json content for current plans
	 * MUST call after prepare()
	 */
	getPackageJson() {
		let rs = _.pick(this.packageJson, 'version', 'description', 'main', 'author', 'license')
		rs.dependencies = _.clone(this.npm.dependencies)
		rs.devDependencies = _.clone(this.npm.devDependencies)
		rs.name = _.keys(this.modules.plan).join('-')
		return rs
	}
	getPackageJsonPath() {
		return path.join(__dirname, '../../', 'package.json')
	}
	/*
	 * get the bower.json content for current plans
	 * MUST call after prepare()
	 */
	getBowerJson() {
		let rs = this.getPackageJson()
		rs.dependencies = this.bower.dependencies
		rs.devDependencies = {}
		return rs
	}
	getBowerJsonPath() {
		return path.join(__dirname, '../../', 'bower.json')
	}
	/*
	 * extend this.config
	 * it will override plans' config if it is call after prepare(), vice versa.
	 */
	setConfig(configfile) {
		let abs = path.isAbsolute(configfile) ? configfile : path.join(process.cwd(), configfile)
		let config = require(abs)
		_.extend(this.config, config)
		module.require_alias('brickyard/config', this.config)
	}
	/*
	 * check if plans are built in a directory.
	 * MUST call after setBuildPath()
	 */
	isBuilt() {
		let dir = this.dirs.dest
		if (!glob.sync(`${dir}/package.json`)) {
			return false
		}

		let modules = glob.sync(`${dir}/brickyard_modules/*`)
		modules = _.map(modules, (v) => path.relative(`${dir}/brickyard_modules/`, v))
		// console.trace(modules)
		modules = _.xor(modules, _.keys(this.modules.buildtask))
		// console.trace(modules)
		modules = _.xor(modules, _.keys(this.modules.backend))
		// console.trace(modules)
		modules = _.xor(modules, _.keys(this.modules.plan))
		// console.trace(modules)

		return modules.length === 0
	}
	/*
	 * dump this.config to ${this.dirs.dest}/config.js
	 * MUST call after prepare()
	 */
	dumpConfig() {
		this.config.modules = []
		for (let md of this.modules) {
			if (['backend', 'buildtask'].indexOf(md.type) !== -1) {
				this.config.modules.push(md.name)
			}
		}
		let content = `module.exports = ${JSON.stringify(this.config, null, '\t')}`
		fs.writeFileSync(`${this.dirs.dest}/config.js`, content)
	}
}

module.exports = Brickyard
