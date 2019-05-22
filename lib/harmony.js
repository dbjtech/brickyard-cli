const semver = require('semver')

if (semver.lt(process.version, '10.0.0')) {
	throw new Error('brickyard-cli needs node 10 or above')
}
