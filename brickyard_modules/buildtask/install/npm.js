const childProcess = require('child_process')
const _ = require('lodash')

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npm = {
	install: (params, options) => {
		const cmd = `${npmCmd} install ${params.join(' ')}`
		return childProcess.execSync(cmd, _.defaults(options || {}, { stdio: 'inherit' }))
	},
	version: () => childProcess.execSync(`${npmCmd} --version`, { stdio: 'pipe' }).toString().trim(),
}

module.exports = npm
