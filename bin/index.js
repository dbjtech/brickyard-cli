#!/usr/bin/env node
const yargs = require('yargs')
const hack = require('../lib/hack.js')
const brickyard = require('../lib/brickyard')

function cmd_handler(argv, cmd) {
	if (argv._.length !== 1) {
		throw new Error('Unique <cmd> is needed')
	}
	process.nextTick(() => {
		hack.gulp(argv, cmd)
	})
}

let av = yargs.usage('$0 <cmd> [args]')
	.help('help')
	.demand(1, '<cmd> is needed')

	.count('verbose')
	.describe('verbose', 'Log level. 0: INFO, 1: DEBUG, 2: TRACE')
	.alias('v', 'verbose')
	.boolean('color')
	.describe('color', 'Log with color')
	.boolean('debug')
	.describe('debug', 'Use debug mode to build a plan')
	.option('brickyard_modules', {
		desc: 'Path of brickyard_modules folder',
		default: './brickyard_modules',
	})
	.option('config', {
		desc: 'Path of config.js',
		default: './config.js',
	})
	.option('output', {
		desc: 'Path of config.js',
		alias: 'o',
		default: './output',
	})
	.option('dir', {
		desc: 'Path of the brickyard app for run',
		default: './',
	})

	.command('ls [plan...]', 'Get the plan list of brickyard_modules', hack.noop, (argv) => cmd_handler(argv, 'ls'))
	.command('build <plan...>', 'Build one or more plans', hack.noop, (argv) => cmd_handler(argv, 'build'))
	.command('test <plan...>', 'Test one or more plans', hack.noop, (argv) => cmd_handler(argv, 'test'))
	.command('run <dir>', 'Run a brickyard app', hack.noop, (argv) => cmd_handler(argv, 'run'))

	.strict()
	.argv

// console.log(av)
hack.require()
module.require_alias('brickyard/argv', __filename)
module.require_alias('brickyard', brickyard)
hack.console(av)

module.exports = av
