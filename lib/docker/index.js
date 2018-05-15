const childProcess = require('child_process')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const _ = require('lodash')
const Bluebird = require('bluebird')

Bluebird.promisifyAll(fs)

const TemplateType = {
	Frontend: 'dockerfile.frontend',
	Backend: 'dockerfile.backend',
}

function getTemplateType(modules) {
	return _.find(modules, { type: 'backend' }) ? TemplateType.Backend : TemplateType.Frontend
}

async function writeDockerfile(dir, modules, config) {
	const compiled = _.template(await readFileAsync(path.join(__dirname, getTemplateType(modules))))
	const dockerfilePath = path.join(dir, 'dockerfile').replace(/\\/g, '/')
	const packageJsonPath = path.join(dir, 'package.json').replace(/\\/g, '/')
	const conf = _.extend({}, config, { packageJsonPath })
	conf.configPathExists = await fse.pathExists(conf.configPath)

	// write package.json to output so that docker build can install npm package before src code copy.
	// then we can reuse the docker layer with node_modules installed
	await writeFileAsync(packageJsonPath, JSON.stringify(conf.packageJson, null, '\t'))

	await writeFileAsync(dockerfilePath, compiled(conf))
	return dockerfilePath
}

function runDockerBuild(file, tag) {
	let cmd = `docker build . -f ${file}`
	if (tag) {
		cmd += ` -t ${tag}`
	}
	childProcess.execSync(cmd, { stdio: 'inherit' })
}

module.exports = {
	TemplateType,
	writeDockerfile,
	runDockerBuild,
}
