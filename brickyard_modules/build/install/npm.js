const childProcess = require('child_process')

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npm = {
	install: params => childProcess.execSync(`${npmCmd} install ${params.join(' ')}`, { stdio: 'inherit' }),
	version: () => childProcess.execSync(`${npmCmd} --version`, { stdio: 'pipe' }).toString().trim(),
}

module.exports = npm
