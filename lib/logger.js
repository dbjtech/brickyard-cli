/* eslint-disable no-underscore-dangle */
const util = require('util')
const moment = require('moment')
const _ = require('lodash')

const origin = {}
const hack = {}

let innerLevel = 0

_.forEach([
	{ name: 'trace', stream: console._stdout, prefix: 'T', level: 2 },
	{ name: 'debug', stream: console._stdout, prefix: 'D', level: 1 },
	{ name: 'info', stream: console._stdout, prefix: 'I', level: 0 },
	{ name: 'log', stream: console._stdout, prefix: 'I', level: 0 },
	{ name: 'warn', stream: console._stderr, prefix: 'W', level: 0 },
	{ name: 'error', stream: console._stderr, prefix: 'E', level: 0 },
], ({ name, stream, prefix, level }) => {
	origin[name] = console[name]
	hack[name] = (...p) => {
		if (innerLevel >= level) {
			stream.write(`[${prefix} ${moment().format('YYMMDD HH:mm:ss.SSS ZZ')}] ${util.format(...p)}\n`)
		}
	}
})

function setLevel(level) {
	if (!(level >= 0 && level <= 2)) {
		throw new Error(`Invalid Level: ${level}`)
	}
	innerLevel = level
}

function hackConsole(flag = true) {
	_.forIn((flag ? hack : origin), (func, name) => { console[name] = func })
}

module.exports = {
	setLevel,
	hackConsole,
}
