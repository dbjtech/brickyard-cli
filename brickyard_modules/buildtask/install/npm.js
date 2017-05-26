const childProcess = require('child_process')
const _ = require('lodash')

const npm = {
	install: (params, options) => {
		let cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
		cmd = `${cmd} install ${params.join(' ')}`
		return childProcess.execSync(cmd, _.defaults(options || {}, { stdio: 'inherit' }))
	},
}

module.exports = npm
