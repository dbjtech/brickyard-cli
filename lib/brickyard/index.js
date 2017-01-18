const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const minimatch = require('minimatch')
const events = require('events')
const semver = require('semver')
const glob = require('glob')

const BrickyardModules = require('./BrickyardModules')

function wrapRequire(packageJson) {
	return require(packageJson) // eslint-disable-line import/no-dynamic-require, global-require
}

function tryToRequire(name) {
	try {
		wrapRequire(name)
		console.debug(`load ${name} [success]`)
	} catch (err) {
		console.error(`load ${name} [failed]`)
		throw err
	}
}

function multiGlobSync(...pattens) {
	let rs = []
	pattens.forEach((patten) => {
		if (patten[0] !== '!') {
			rs = _.union(rs, glob.sync(patten))
		} else {
			rs = _.difference(rs, glob.sync(patten.substring(1)))
		}
	})
	return rs
}

function alias(dependencies) {
	_.keys(dependencies).forEach((key) => {
		module.require_alias(key, wrapRequire(key))
	})
}

function aliasBrickyardModule(base, md) {
	if (['backend', 'buildtask'].indexOf(md.type) === -1) {
		return
	}
	const mainDestFullPath = `${path.join(base, md.type, md.name)}`
	module.require_alias(`brickyard/${md.type}/${md.name}`, mainDestFullPath)
	if (md.type === 'backend') {
		module.require_alias(`brickyard/${md.name}`, mainDestFullPath)
	}
	console.trace(`alias ${md.type} module`, md.name)
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
		this.packageJson = wrapRequire(path.join(__dirname, '../../', 'package.json'))
		this.npm.dependencies = _.clone(this.packageJson.dependencies)
		this.npm.devDependencies = {}

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
		paths = _.map(paths, p => (path.isAbsolute(p) ? p : path.join(process.cwd(), p)))
		this.modulePaths = (paths.length === 1) ? paths[0] : `{${paths.join(',')}}`
		const files = multiGlobSync(
			`${this.modulePaths}/**/package.json`,
			`!${this.modulePaths}/**/node_modules/**/package.json`)
		_.forEach(files, (file) => {
			const md = new BrickyardModules(file)
			if (md.type !== 'unknow') {
				this.allModules.push(md)
			}
			this.allModules[md.type][md.name] = md
			console.trace('scanned', md.type, 'module', md.name)
		})
		return files.length
	}

	/*
	 * scan bower components in this.dirs.bower
	 * MUST call after setBuildPath()
	 */
	scanBowerModules() {
		const rs = {}
		glob.sync(`${this.dirs.bower}/*/bower.json`).forEach((file) => {
			const md = new BrickyardModules(file)
			md.type = 'bower'
			if (md.mainDest && !path.isAbsolute(md.mainDest)) {
				md.mainDest = path.join(this.dirs.bower, md.mainDest)
			}
			rs[md.name] = md
			console.trace('scanned', md.type, 'module', md.name)
		})
		return rs
	}

	/*
	 * 1. find the modules matching the plans' declaration,
	 *     put them into this.modules and this.modules.plan
	 * 2. set this.config base on plans
	 *
	 * MUST call after scan
	 */
	preparePlan(..._plans) {
		if (!_.isEmpty(this.modules.plan)) {
			throw new Error('multiple preparing plans are not allow')
		}
		const plans = _.flatten(_plans)
		console.trace('preparing', plans.join(','))
		plans.forEach((name) => {
			const md = this.allModules.plan[name]
			if (!md) {
				throw new Error(`Plan module ${name} not found`)
			}
			this.modules.push(md)
			this.modules[md.type][md.name] = md

			const plan = wrapRequire(md.mainSrc)
			if (!plan.modules) {
				throw new Error(`Plan module ${name} return empty content`)
			}
			_.extend(this.config, plan.config)
			this.expectModules.push(...plan.modules)
		})
	}

	/*
	 * 1. put plans' expectModules into this.modules (sort by declaration)
	 * 2. alias require('brickyard/[module.name]') to module.mainDest and module.mainSrc
	 * 3. set this.npm.dependencies and this.bower.dependencies
	 * MUST call after preparePlan() and setBuildPath()
	 */
	prepareModule() {
		const enable = (md) => {
			if (this.modules[md.type][md.name]) {
				return
				// throw new Error(`Name conflict: ${md.type} modules ${md.name}`)
			}
			this.modules.push(md)
			this.modules[md.type][md.name] = md
			aliasBrickyardModule(this.dirs.modules, md)
		}

		// 1, 2
		this.expectModules.forEach((r) => {
			const rule = typeof r === 'string' ? { type: 'path', pattern: r } : r
			this.allModules.forEach((md) => {
				if (rule.type === 'path') {
					const pattern1 = `${this.modulePaths}/${rule.pattern}`
					const pattern2 = `${this.modulePaths}/${rule.pattern}/**`
					if (minimatch(md.path, pattern1) || minimatch(md.path, pattern2)) {
						enable(md)
					}
				} else if (rule.type === 'name') {
					if (rule.pattern instanceof RegExp) {
						if (rule.pattern.test(md.name)) {
							enable(md)
						}
					} else if (md.name === rule.pattern) {
						enable(md)
					}
				}
			})
		})

		// 3
		this.modules.forEach((md) => {
			_.extend(this.npm.dependencies, md.dependencies)
			_.extend(this.npm.devDependencies, md.devDependencies)
			_.extend(this.bower.dependencies, md.bowerDependencies)
		})
	}

	/*
	 * Init this.modules according to config. for brickyard run only
	 * MUST call after setConfig()
	 */
	prepareModuleRuntime() {
		if (_.isEmpty(this.config.modules)) {
			throw new Error('The config is not for runtime')
		}
		this.config.modules.forEach((expectModule) => {
			const md = this.allModules.backend[expectModule] || this.allModules.buildtask[expectModule]
			if (!md) {
				throw new Error(`${expectModule} not found`)
			}
			this.modules.push(md)
			this.modules[md.type][md.name] = md
			aliasBrickyardModule(this.dirs.modules, md)
		})
	}

	/*
	 * indicate brickyard where to place the build files
	 */
	setBuildPath(_dest) {
		if (!_dest) {
			throw new Error('wrong build path')
		}

		const dest = path.isAbsolute(_dest) ? _dest : path.join(process.cwd(), _dest)

		this.dirs = {
			dest,
			temp: path.join(dest, 'temp'),
			tempModules: path.join(dest, 'temp', 'plugins'),
			modules: path.join(dest, 'brickyard_modules'),
			www: path.join(dest, 'www'),
			bower: path.join(dest, 'bower_components'),
		}
	}

	/*
	 * require all buildtask modules
	 * MUST call after prepare()
	 * param fromSrc: whether to load md.mainSrc. default is false, load from md.mainDest
	 */
	loadBuildTasks() {
		alias(this.packageJson.dependencies)
		_.each(this.modules.buildtask, (md) => {
			tryToRequire(`brickyard/${md.type}/${md.name}`)
		})
	}

	/*
	 * require all backend modules
	 * MUST call after prepareModuleRuntime()
	 * param fromSrc: whether to load md.mainSrc. default is false, load from md.mainDest
	 */
	loadBackendModules() {
		_.each(this.modules.backend, (md) => {
			tryToRequire(`brickyard/${md.type}/${md.name}`)
		})
	}

	/*
	 * get the package.json content for current plans
	 * MUST call after prepare()
	 */
	getPackageJson() {
		const rs = _.pick(this.packageJson, 'version', 'description', 'main', 'author', 'license')
		rs.dependencies = _.clone(this.npm.dependencies)
		rs.devDependencies = _.clone(this.npm.devDependencies)
		rs.name = _.keys(this.modules.plan).join('-')
		return rs
	}

	/*
	 * get the bower.json content for current plans
	 * MUST call after prepare()
	 */
	getBowerJson() {
		const rs = this.getPackageJson()
		rs.dependencies = this.bower.dependencies
		rs.devDependencies = {}
		return rs
	}

	/*
	 * extend this.config
	 * it will override plans' config if it is call after prepare(), vice versa.
	 */
	setConfig(configfile) {
		const abs = path.isAbsolute(configfile) ? configfile : path.join(process.cwd(), configfile)
		const config = wrapRequire(abs)
		_.extend(this.config, config)
		module.require_alias('brickyard/config', this.config)
	}

	/*
	 * check if plans are built in a directory.
	 * MUST call after setBuildPath()
	 */
	isBuilt() {
		const dir = this.dirs.dest
		if (!glob.sync(`${dir}/package.json`)) {
			return false
		}

		const getModuleNameFromPath = pattern =>
			_.map(glob.sync(`${pattern}/*`), v => path.relative(`${pattern}`, v))


		_.forEach(['plan', 'buildtask', 'backend'], (type) => {
			const modules = getModuleNameFromPath(`${dir}/brickyard_modules/${type}`)
			const xor = _.xor(modules, _.keys(this.modules[type]))
			return !xor.length // TODO
		})

		return true
	}

	/*
	 * dump this.config to ${this.dirs.dest}/config.js
	 * MUST call after prepare()
	 */
	dumpConfig() {
		this.config.modules = []
		this.modules.forEach((md) => {
			if (['backend', 'buildtask'].indexOf(md.type) !== -1) {
				this.config.modules.push(md.name)
			}
		})
		const content = `module.exports = ${JSON.stringify(this.config, null, '\t')}`
		fs.writeFileSync(`${this.dirs.dest}/config.js`, content)
	}
}

function getJsonPath(jsonName) {
	return path.join(__dirname, '../../', jsonName)
}

module.exports = new Brickyard()
module.exports.getPackageJsonPath = () => getJsonPath('package.json')
module.exports.getBowerJsonPath = () => getJsonPath('bower.json')
