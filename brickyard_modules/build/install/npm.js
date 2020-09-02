const childProcess = require('child_process')

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'

module.exports = {
	install: (params) => childProcess.execSync(`${npmCmd} install ${params.join(' ')}`, { stdio: 'inherit' }),
}
