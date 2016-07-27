const util = require('util')
const moment = require('moment')

class Logger {
	constructor() {
		this.origin = {}
		this.level = 0

		this.types = [
			{ name: 'trace', stream: console._stdout, prefix: 'T', level: 2 },
			{ name: 'debug', stream: console._stdout, prefix: 'D', level: 1 },
			{ name: 'info', stream: console._stdout, prefix: 'I', level: 0 },
			{ name: 'log', stream: console._stdout, prefix: 'I', level: 0 },
			{ name: 'warn', stream: console._stderr, prefix: 'W', level: 0 },
			{ name: 'error', stream: console._stderr, prefix: 'E', level: 0 },
		]

		for (let type of this.types) {
			this.origin[type.name] = console[type.name]
		}

		for (let type of this.types) {
			this[type.name] = (...p) => {
				if (this.level < type.level) return
				type.stream.write(`[${type.prefix} ${moment().format('YYMMDD HH:mm:ss.SSS ZZ')}] ${util.format(...p)}\n`)
			}
		}
	}
	setLevel(level) {
		this.level = level
	}
	hackConsole() {
		for (let type of this.types) {
			console[type.name] = this[type.name]
		}
	}
	unhackConsole() {
		for (let type of this.types) {
			console[type.name] = this.origin[type.name]
		}
	}
}

module.exports = Logger
