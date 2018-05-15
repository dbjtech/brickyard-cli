const semver = require('semver')

if (semver.lt(process.version, '8.0.0')) {
	throw new Error('brickyard-cli needs node 8 or above')
}
