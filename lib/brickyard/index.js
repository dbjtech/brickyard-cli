const path = require('path')
const _ = require('lodash')
const minimatch = require('minimatch')
const events = require('events')
const semver = require('semver')
const util = require('util')
const glob = require('glob')
const fs = require('fs')
const fse = require('fs-extra')

const BrickyardModules = require('./BrickyardModules')
const BrickyardArray = require('./BrickyardArray')

const writeFileAsync = util.promisify(fs.writeFile).bind(fs)
const globAsync = util.promisify(glob)

function tryToRequire(name) {
	try {
		return require(name) // eslint-disable-line import/no-dynamic-require, global-require
	} catch (err) {
		console.error(`Load ${name} [failed]`)
		throw err
	}
}

function multiGlobAsync(pattens) {
	const matchs = []
	const notMatchs = []
	return Promise.all(pattens.map((patten) => {
		if (patten[0] === '!') {
			return globAsync(patten.substring(1)).then((files) => { notMatchs.push(...files) })
		}
		return globAsync(patten).then((files) => { matchs.push(...files) })
	})).then(() => _.difference(matchs, notMatchs))
}

function getPath(file) {
	return path.isAbsolute(file) ? file : path.join(process.cwd(), file)
}

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

async function copyModules(src, dest) {
	const srcPaths = await globAsync(`${src}/**`, { nodir: true })
	await Promise.all(srcPaths.map((srcPath) => {
		const destPath = path.join(dest, path.relative(src, srcPath))
		return fse.copy(srcPath, destPath)
	}))
}

class Brickyard extends events.EventEmitter {
	constructor() {
		super()
		this.Class = Brickyard
		this.allModules = new BrickyardArray()
		this.modules = new BrickyardArray()

		this.config = {}

		this.npm = {}
		this.bower = {}
		this.bower.dependencies = {}
		this.packageJson = tryToRequire(path.join(__dirname, '../../', 'package.json'))
		this.npm.dependencies = _.clone(this.packageJson.dependencies)
		this.npm.devDependencies = _.clone(this.packageJson.devDependencies)

		this.version = this.packageJson.version
		this.events = new events.EventEmitter()
	}

	scanAsync(...inputPaths) {
		const paths = _.chain(inputPaths)
			.map(getPath)
			.map((e) => path.resolve(e))
			.uniq()
			.value()

		this.modulePaths = (paths.length === 1) ? paths[0] : `{${paths.join(',')}}`

		return multiGlobAsync([
			`${this.modulePaths}/**/package.json`,
			`!${this.modulePaths}/**/node_modules/**/package.json`,
		]).then((files) => {
			files.forEach((file) => {
				const md = new BrickyardModules(file)
				this.allModules.push(md)
			})
		})
	}

	preparePlan(...plans) {
		if (!_.isEmpty(this.modules.plan)) {
			throw new Error('multiple preparing plans are not allow')
		}

		const requirePlan = (name) => {
			const md = this.allModules.plan[name]
			if (!md) {
				throw new Error(`Plan module ${name} not found`)
			}
			const plan = tryToRequire(md.mainSrc)
			if (!plan.modules) {
				throw new Error(`Plan module ${name} return empty content`)
			}
			return plan
		}
		const recursiveInclude = (includes, all = []) => {
			const newIncludes = _.difference(includes, all)
			all.unshift(...newIncludes)
			newIncludes.forEach((name) => {
				const plan = requirePlan(name)
				if (plan.includes instanceof Array) {
					recursiveInclude(plan.includes, all)
				}
			})
			return all
		}
		recursiveInclude(plans).forEach((name) => {
			const md = this.allModules.plan[name]
			if (md) {
				this.modules.push(md)
			}
			const plan = requirePlan(name)

			plan.modules.forEach((r) => {
				const rule = typeof r === 'string' ? { type: 'path', pattern: r } : r

				const mathModules = this.allModules.filter((mmd) => {
					if (rule.type === 'path') {
						const pattern1 = `${this.modulePaths}/${rule.pattern}`
						const pattern2 = `${this.modulePaths}/${rule.pattern}/**`
						if (minimatch(mmd.path, pattern1) || minimatch(mmd.path, pattern2)) {
							return true
						}
					} else if (rule.type === 'name') {
						if (rule.pattern instanceof RegExp && rule.pattern.test(mmd.name)) {
							return true
						}
						if (md.name === rule.pattern) {
							return true
						}
					}
					return false
				})

				if (mathModules.length === 0) {
					console.warn(`${r} dose not include any modules`)
					return
				}

				this.modules.pushUnique(...mathModules)
			})
		})
	}

	setBuildPath(_dest) {
		if (!_dest) {
			throw new Error(`wrong build path: ${_dest}`)
		}

		const dest = path.isAbsolute(_dest) ? _dest : path.join(process.cwd(), _dest)

		this.dirs = {
			dest,
			temp: path.join(dest, 'brickyard_modules', 'frontend'),
			tempModules: path.join(dest, 'brickyard_modules', 'frontend', 'modules'),
			modules: path.join(dest, 'brickyard_modules'),
			www: path.join(dest, 'www'),
			bower: path.join(dest, 'bower_components'),
		}
	}

	hackDependencies() {
		Object.keys(this.packageJson.dependencies).forEach((key) => {
			module.require_alias(key, tryToRequire(key))
		})
	}

	prepareDependencies() {
		_.forEach(this.modules, (md) => {
			Object.assign(this.npm.dependencies, md.dependencies)
			Object.assign(this.npm.devDependencies, md.devDependencies)
			Object.assign(this.bower.dependencies, md.bowerDependencies)
		})
	}

	loadModules(...types) {
		_.chain(this.modules)
			.filter(({ type }) => types.indexOf(type) > -1)
			.forEach(({ name, type }) => {
				const mainDestFullPath = `${path.join(this.dirs.modules, type, name)}`
				module.require_alias(`brickyard/${type}/${name}`, mainDestFullPath)
				if (type === 'backend') {
					module.require_alias(`brickyard/${name}`, mainDestFullPath)
					module.require_alias(`brickyard\\${name}`, mainDestFullPath)
					module.require_alias(`@brickyard/${name}`, mainDestFullPath)
					module.require_alias(`@brickyard\\${name}`, mainDestFullPath)
				}
			})
			.forEach(({ name, type }) => {
				tryToRequire(`brickyard/${type}/${name}`)
			})
			.value()
	}

	async buildModules({ keepDestFiles = false } = {}) {
		if (!keepDestFiles) {
			await fse.remove(this.dirs.modules)
			await fse.remove(this.dirs.tempModules)
		}

		await Promise.all(this.modules.map((md) => {
			let dest
			if (['buildtask', 'backend', 'plan'].indexOf(md.type) !== -1) {
				dest = path.join(this.dirs.modules, md.type, md.name)
			} else if (md.type === 'frontend') {
				dest = path.join(this.dirs.tempModules, md.name)
			} else {
				throw new Error(`unknown brickayrd module type, get '${md.type}' from ${md.path}`)
			}
			return copyModules(md.path, dest)
		}))
	}

	async buildSettingAsync(configPath) {
		const hasConfig = await fse.pathExists(configPath)
		const config = hasConfig ? tryToRequire(getPath(configPath)) : {}
		const planConfig = Object.values(this.modules.plan).map((md) => tryToRequire(md.mainSrc).config)

		const configObj = Object.assign({}, ...planConfig, config)
		const modules = this.modules.filter(({ type }) => ['backend', 'buildtask'].indexOf(type) > -1)

		await writeFileAsync(`${this.dirs.dest}/config.js`, `module.exports = ${JSON.stringify(configObj, null, '\t')}`)
		await writeFileAsync(`${this.dirs.dest}/setting.js`, `
			const config = require('./config.js')
			const modules = ${JSON.stringify(modules, null, '\t')}
			module.exports = { config, modules, }
		`)
	}

	async saveAsync(dir, configPath) {
		this.setBuildPath(dir)

		await this.buildModules()
		await this.buildSettingAsync(configPath)
		this.loadSettingAsync(dir)
	}

	loadSettingAsync(dir) {
		const settingPath = path.join(dir, 'setting.js')
		if (!(fse.pathExistsSync(settingPath))) throw new Error('setting.js not found')
		const setting = tryToRequire(getPath(settingPath))
		this.config = setting.config
		return setting
	}

	loadAsync(dir) {
		this.setBuildPath(dir)
		const setting = this.loadSettingAsync(dir)
		setting.modules.forEach((module) => { this.modules.push(module) })
	}

	inject(argv) {
		this.argv = argv
		if (typeof (argv.debug) !== 'undefined') {
			this.debug = argv.debug
			this.config.debug = argv.debug
		}
		module.require_alias('brickyard', this)
		module.require_alias('brickyard/config', this.config)
	}

	loadRuntime(argv) {
		this.loadAsync(argv.dir)
		this.hackDependencies()
		this.inject(argv)
		this.loadModules('backend')
	}

	sendSignals(...signals) {
		signals.forEach((signal) => {
			this.events.emit(signal, () => console.warn('Callback of brickyard signals is deprecated.'))
		})
	}

	/** Exports Start */
	static async createModule(type, dir, name) {
		const candidates = ['frontend', 'backend', 'buildtask', 'plan']
		if (candidates.indexOf(type) === -1) {
			throw new Error(`module type must be ${candidates}`)
		}
		const mdName = name || path.basename(dir)
		if (!/[\w-\d]*/.test(mdName)) {
			throw new Error(`${name} is not a valid module name`)
		}
		await fse.ensureDir(dir)
		const conf = getPackageJson(mdName, type)
		const configContent = `${JSON.stringify(conf, null, 2)}\n`
		const configPath = path.join(dir, 'package.json')
		await writeFileAsync(configPath, configContent)
		await writeFileAsync(path.join(dir, 'index.js'), '')
		return new BrickyardModules(configPath)
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
	 * get the package.json content for current plans
	 * MUST call after prepare()
	 */
	getPackageJson() {
		const rs = _.pick(this.packageJson, 'version', 'description', 'main', 'author', 'license')
		rs.dependencies = _.clone(this.npm.dependencies)
		rs.devDependencies = _.clone(this.npm.devDependencies)
		rs.name = Object.keys(this.modules.plan).join('-')
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
			if (!this.bower.dependencies[md.name]) {
				console.debug(`bower module ${md.name} is not in bower.json, ignore.`)
				return
			}
			md.type = 'bower'
			if (md.mainDest && !path.isAbsolute(md.mainDest)) {
				md.mainDest = path.join(this.dirs.bower, md.mainDest)
			}
			rs[md.name] = md
		})
		return rs
	}

	/** Exports End */
}

module.exports = new Brickyard()
