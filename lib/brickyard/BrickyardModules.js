const fs = require('fs')
const path = require('path')
const _ = require('lodash')

function wrapRequire(packageJson) {
	return require(packageJson) // eslint-disable-line import/no-dynamic-require, global-require
}

module.exports = class BrickyardModules {
	constructor(inputPackageJson) {
		// handle package.json
		const packageJson = (path.isAbsolute(inputPackageJson) ?
			inputPackageJson : path.join(process.cwd(), inputPackageJson))
		const config = wrapRequire(packageJson)

		_.extend(this, _.pick(config, 'name', 'description', 'dependencies', 'devDependencies', 'scripts'))

		this.path = path.dirname(packageJson)
		if (config.main) {
			const main = config.main instanceof Array ? _.filter(config.main, e => e.match(/\.js$/))[0] : config.main
			if (main) {
				this.main = main
				this.mainSrc = path.join(this.path, main)
				this.mainDest = path.join(this.name, main)
			}
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
		const bowerJson = path.join(this.path, 'bower.json')
		try {
			fs.accessSync(bowerJson)
			const bowerConfig = wrapRequire(bowerJson)
			if (bowerConfig && bowerConfig.dependencies) {
				this.bowerDependencies = bowerConfig.dependencies
			}
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err
			}
		}
	}
}
