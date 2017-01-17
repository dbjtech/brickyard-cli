#!/usr/bin/env node

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

		if (argv.color) {
			params.push('--color')
		}

		if (argv.verbose < 1) {
			params.push('--silent')
		}

		const clone = _.clone(process.argv)
		process.argv = params
		require('gulp/bin/gulp.js') // eslint-disable-line global-require
		process.argv = clone
	}
}

/* eslint-disable no-unused-expressions */
module.exports = yargs
	.usage('$0 <cmd> [args]')
	.version()
	.help('help')
	.demand(1, '<cmd> is needed')
	.option('verbose', {
		desc: 'Log level. 0: INFO, 1: DEBUG, 2: TRACE',
		alias: 'v',
		global: true,
	})
	.option('color', {
		desc: 'Log with color',
		global: true,
	})
	.option('debug', {
		desc: 'Use debug mode to build a plan',
		global: true,
	})
	.option('brickyard_modules', {
		desc: 'Path of brickyard_modules folder',
		default: './brickyard_modules',
		global: true,
	})
	.option('config', {
		desc: 'Path of config.js',
		default: './config.js',
		global: true,
	})
	.option('output', {
		desc: 'Path of output',
		alias: 'o',
		default: './output',
		global: true,
	})
	.option('dir', {
		desc: 'Path of the brickyard app for run',
		default: './',
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
