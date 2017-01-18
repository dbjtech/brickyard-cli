const fs = require('fs')
const path = require('path')
const _ = require('lodash')

function wrapRequire(packageJson) {
	return require(packageJson) // eslint-disable-line import/no-dynamic-require, global-require
}

class BrickyardModules {
	constructor(inputPackageJson) {
		// handle package.json
		const packageJson = (path.isAbsolute(inputPackageJson) ?
			inputPackageJson : path.join(process.cwd(), inputPackageJson))
		const config = wrapRequire(packageJson)
		this.config = config
		this.name = config.name
		this.path = path.dirname(packageJson)
		this.description = config.description
		this.devDependencies = config.devDependencies || {}
		this.dependencies = config.dependencies || {}

		if (config.main instanceof Array) {
			config.main = _.filter(config.main, e => e.match(/\.js$/))[0]
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
			const bowerJson = path.join(this.path, 'bower.json')
			fs.accessSync(bowerJson)
			const bowerConfig = wrapRequire(bowerJson)
			this.bowerDependencies = bowerConfig.dependencies || {}
		} catch (e) {
			// TODO
			// Should handle the Error
		}
	}
}

module.exports = BrickyardModules
