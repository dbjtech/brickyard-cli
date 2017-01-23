const path = require('path')
const _ = require('lodash')
const minimatch = require('minimatch')
const events = require('events')
const semver = require('semver')
const Bluebird = require('bluebird')
const glob = require('glob')
const fs = Bluebird.promisifyAll(require('fs'))

const BrickyardModules = require('./BrickyardModules')
const BrickyardArray = require('./BrickyardArray')

const globAsync = Bluebird.promisify(glob)

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

function multiGlobAsync(pattens) {
	const matchs = []
	const notMatchs = []
	return Bluebird.all(_.map(pattens, (patten) => {
		if (patten[0] === '!') {
			return globAsync(patten.substring(1)).then((files) => { notMatchs.push(...files) })
		}
		return globAsync(patten).then((files) => { matchs.push(...files) })
	})).then(() => _.difference(matchs, notMatchs))
}

class Brickyard extends events.EventEmitter {

	constructor() {
		super()
		this.allModules = new BrickyardArray()
		this.modules = new BrickyardArray()

		this.config = {}

		this.npm = {}
		this.bower = {}
		this.bower.dependencies = {}
		this.packageJson = wrapRequire(path.join(__dirname, '../../', 'package.json'))
		this.npm.dependencies = _.clone(this.packageJson.dependencies)
		this.npm.devDependencies = _.clone(this.packageJson.devDependencies)

		this.version = this.packageJson.version
		this.events = new events.EventEmitter()
	}

	scanAsync(...inputPaths) {
		const paths = _.map(inputPaths, p => (path.isAbsolute(p) ? p : path.join(process.cwd(), p)))

		this.modulePaths = (paths.length === 1) ? paths[0] : `{${paths.join(',')}}`

		return multiGlobAsync([
			`${this.modulePaths}/**/package.json`,
			`!${this.modulePaths}/**/node_modules/**/package.json`,
		]).then((files) => {
			files.forEach((file) => {
				const md = new BrickyardModules(file)
				this.allModules.push(md)
				console.trace('scanned', md.type, 'module', md.name)
			})
		})
	}

	preparePlan(...plans) {
		if (!_.isEmpty(this.modules.plan)) {
			throw new Error('multiple preparing plans are not allow')
		}

		plans.forEach((name) => {
			const md = this.allModules.plan[name]
			if (!md) {
				throw new Error(`Plan module ${name} not found`)
			}
			this.modules.push(md)

			const plan = wrapRequire(md.mainSrc)
			if (!plan.modules) {
				throw new Error(`Plan module ${name} return empty content`)
			}
			_.extend(this.config, plan.config)
			plan.modules.forEach((r) => {
				const rule = typeof r === 'string' ? { type: 'path', pattern: r } : r
				this.allModules.forEach((mmd) => {
					if (rule.type === 'path') {
						const pattern1 = `${this.modulePaths}/${rule.pattern}`
						const pattern2 = `${this.modulePaths}/${rule.pattern}/**`
						if (minimatch(mmd.path, pattern1) || minimatch(mmd.path, pattern2)) {
							this.modules.push(mmd)
						}
					} else if (rule.type === 'name') {
						if (rule.pattern instanceof RegExp) {
							if (rule.pattern.test(mmd.name)) {
								this.modules.push(mmd)
							}
						} else if (md.name === rule.pattern) {
							this.modules.push(mmd)
						}
					}
				})
			})
		})
	}

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

	hackDependencies() {
		_.keys(this.packageJson.dependencies).forEach((key) => {
			module.require_alias(key, wrapRequire(key))
		})
	}

	prepareDependencies() {
		_.forEach(this.modules, (md) => {
			_.extend(this.npm.dependencies, md.dependencies)
			_.extend(this.npm.devDependencies, md.devDependencies)
			_.extend(this.bower.dependencies, md.bowerDependencies)
		})
	}

	loadModules(...types) {
		this.modules.forEach(({ name, type }) => {
			if (types.indexOf(type) > -1) {
				const mainDestFullPath = `${path.join(this.dirs.modules, type, name)}`
				module.require_alias(`brickyard/${type}/${name}`, mainDestFullPath)
				if (type === 'backend') {
					module.require_alias(`brickyard/${name}`, mainDestFullPath)
				}
				console.trace(`alias ${type} module`, name)
			}
		})
		this.modules.forEach(({ name, type }) => {
			if (types.indexOf(type) > -1) {
				tryToRequire(`brickyard/${type}/${name}`)
			}
		})
	}

	buildConfigAsync(configfile) {
		return Bluebird.coroutine(function* g() {
			yield fs.accessAsync(configfile)

			const abs = path.isAbsolute(configfile) ? configfile : path.join(process.cwd(), configfile)
			const config = wrapRequire(abs)
			_.extend(this.config, config)

			this.config.modules = []
			this.modules.forEach((md) => {
				if (['backend', 'buildtask'].indexOf(md.type) !== -1) {
					this.config.modules.push(md.name)
				}
			})

			yield fs.writeFileAsync(`${this.dirs.dest}/config.js`, `module.exports = ${JSON.stringify(this.config, null, '\t')}`)
		}).bind(this)()
	}

	setConfigAsync(configfile) {
		return Bluebird.coroutine(function* g() {
			yield fs.accessAsync(configfile)
			const abs = path.isAbsolute(configfile) ? configfile : path.join(process.cwd(), configfile)
			const config = wrapRequire(abs)
			_.extend(this.config, config)
			module.require_alias('brickyard/config', this.config)

			if (_.isEmpty(this.config.modules)) {
				throw new Error('The config is not for runtime')
			}
			this.config.modules.forEach((expectModule) => {
				const md = this.allModules.backend[expectModule] || this.allModules.buildtask[expectModule]
				if (!md) {
					throw new Error(`${expectModule} not found`)
				}
				this.modules.push(md)
			})
		}).bind(this)()
	}

	/** Exports Start*/

	/*
	 * ensure brickyard-cli version is greater than the param
	 */
	ensureVersion(requiredVersion) {
		if (semver.gt(requiredVersion, this.version)) {
			throw new Error(`brickyard_modules require brickyard-cli@${requiredVersion} and current version is ${this.version}`)
		}
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

	getJsonPath(jsonName) { // eslint-disable-line class-methods-use-this
		return path.join(__dirname, '../../', jsonName)
	}

	getPackageJsonPath() {
		return this.getJsonPath('package.json')
	}

	getBowerJsonPath() {
		return this.getJsonPath('bower.json')
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

	/** Exports End*/
}

module.exports = new Brickyard()
