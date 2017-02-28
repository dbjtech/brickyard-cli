#!/usr/bin/env node
require('../lib/harmony.js')
const yargs = require('yargs')
const _ = require('lodash')

function cmdHandler(cmd) {
	return (argv) => {
		if (argv._.length !== 1) {
			throw new Error('Unique <cmd> is needed')
		}
		// node index.js <cmd>
		const params = ['node', './index.js']

		// node index.js --cmd <cmd>
		params.push('--cmd', cmd)

		// node index.js --cmd <cmd> --gulpfile ./gulpfile.js
		params.push('--gulpfile', argv.gulpfile ? argv.gulpfile : `${__dirname}/../lib/gulpfile.js`)

		// node index.js --cmd <cmd> --gulpfile ./gulpfile.js --cwd ${process.cwd()}
		params.push('--cwd', process.cwd())

		params.push('--color')

		if (!argv.verbose) {
			params.push('--silent')
		}

		const clone = _.clone(process.argv)
		process.argv = params
		require('gulp/bin/gulp.js') // eslint-disable-line global-require
		process.argv = clone
	}
}

const OPTION_MAP = {
	dir: {
		desc: 'Path of the brickyard app for run',
		default: './output',
	},
	config: {
		desc: 'Path of config.js',
		default: './config.js',
	},
	instances: {
		desc: 'Start x instances of app in cluster mode',
		alias: 'i',
		type: 'number',
		default: 1,
	},
}

module.exports = yargs
	.usage('$0 <cmd> [args]')
	.version()
	.help()
	.demand(1, '<cmd> is needed')
	.option('verbose', {
		desc: 'Log level. 0: INFO, 1: DEBUG, 2: TRACE',
		alias: 'v',
		global: true,
		default: 0,
		type: 'count',
	})
	.option('brickyard_modules', {
		desc: 'Path of brickyard_modules folder',
		default: './brickyard_modules',
		global: true,
	})
	.command({
		command: 'ls [plan...]',
		desc: 'Get the plan list of brickyard_modules',
		handler: cmdHandler('ls'),
	})
	.command({
		command: 'build <plan...>',
		desc: 'Build one or more plans',
		builder: args => args.options(_.pick(OPTION_MAP, 'dir', 'config')),
		handler: cmdHandler('build'),
	})
	.command({
		command: 'run [dir]',
		desc: 'Run a brickyard app',
		builder: args => args.options(_.pick(OPTION_MAP, 'dir', 'config', 'instances')),
		handler: cmdHandler('run'),
	})
	.command({
		command: 'test <plan...> [modules...]',
		desc: 'Test modules of plans',
		builder: args => args.options(_.pick(OPTION_MAP, 'dir', 'config')),
		handler: cmdHandler('build'),
	})
	.command({
		command: 'create-module <type> <dir> [name]',
		desc: 'Create a brickyard module with name to the dir',
		handler: cmdHandler('create-module'),
	})
	.strict()
	.argv
