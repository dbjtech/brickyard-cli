#!/usr/bin/env node

const yargs = require('yargs')
const hack = require('../lib/hack.js')
const brickyard = require('../lib/brickyard')
const logger = require('../lib/logger')

function cmdHandler(cmd) {
	return (argv) => {
		if (argv._.length !== 1) {
			throw new Error('Unique <cmd> is needed')
		}
		hack.gulp(argv, cmd)
	}
}

const argv = yargs
	.usage('$0 <cmd> [args]')
	.version()
	.help('help')
	.demand(1, '<cmd> is needed')
	.options({
		verbose: {
			desc: 'Log level. 0: INFO, 1: DEBUG, 2: TRACE',
			alias: 'v',
			global: true,
		},
		color: {
			desc: 'Log with color',
			global: true,
		},
		debug: {
			desc: 'Use debug mode to build a plan',
			global: true,
		},
		brickyard_modules: {
			desc: 'Path of brickyard_modules folder',
			default: './brickyard_modules',
			global: true,
		},
		config: {
			desc: 'Path of config.js',
			default: './config.js',
			global: true,
		},
		output: {
			desc: 'Path of output',
			alias: 'o',
			default: './output',
			global: true,
		},
		dir: {
			desc: 'Path of the brickyard app for run',
			default: './',
			global: true,
		},
	})
	.command({
		command: 'ls [plan...]',
		desc: 'Get the plan list of brickyard_modules',
		handler: cmdHandler('ls'),
	})
	.command({
		command: 'build <plan...>',
		desc: 'Build one or more plans',
		handler: cmdHandler('build'),
	})
	.command({
		command: 'test <plan...>',
		desc: 'Test one or more plans',
		handler: cmdHandler('test'),
	})
	.command({
		command: 'run [dir]',
		desc: 'Run a brickyard app',
		handler: cmdHandler('run'),
	})
	.command({
		command: 'create-module <type> <dir> [name]',
		desc: 'Create a brickyard module with name to the dir',
		handler: cmdHandler('init'),
	})
	.strict()
	.argv

logger.setLevel(argv.verbose)
logger.hackConsole()
hack.require()
module.require_alias('brickyard/private/argv', argv)
module.require_alias('brickyard/private/logger', logger)
module.require_alias('brickyard', brickyard)
