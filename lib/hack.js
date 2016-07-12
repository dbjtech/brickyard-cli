const util = require('util')
const moment = require('moment')
const _ = require('lodash')
const gutil = require('gulp-util')

const gulp = require('gulp')
const del = require('del')
const merge_stream = require('merge-stream')
const run_sequence = require('run-sequence')

function noop() {}

function hack_console(argv) {
	let types = [
		{ name: 'trace', stream: console._stdout, prefix: 'T', level: 2 },
		{ name: 'debug', stream: console._stdout, prefix: 'D', level: 1 },
		{ name: 'info', stream: console._stdout, prefix: 'I', level: 0 },
		{ name: 'log', stream: console._stdout, prefix: 'I', level: 0 },
		{ name: 'warn', stream: console._stderr, prefix: 'W', level: 0 },
		{ name: 'error', stream: console._stderr, prefix: 'E', level: 0 },
	]

	for (let type of types) {
		console[type.name] = function(...p) {
			if (argv.verbose < type.level) return
			type.stream.write(`[${type.prefix} ${moment().format('YYMMDD HH:mm:ss ZZ')}] ${util.format(...p)}\n`)
		}
	}
}

function hack_gulp_attr(argv) {
	gulp.del = del
	gulp.merge = merge_stream
	gulp.run_sequence = run_sequence
	gulp.create_tasks = function(group) {
		_.each(group, (task, id) => {
			gulp.task(id, task)
		})
	}

	let sub_tasks = { build: [], run: [], test: [], watch: [] }
	gulp.register_sub_tasks = function register_sub_tasks(type, priority, task_name) {
		if (!sub_tasks[type]) {
			throw new Error('sub tasks type must be', _.keys(sub_tasks))
		}

		if (!sub_tasks[type][priority]) {
			sub_tasks[type][priority] = task_name
		} else {
			let t = [sub_tasks[type][priority], task_name]
			sub_tasks[type][priority] = _.flatten(t)
		}
	}

	gulp.run_flatten = function(type, cb) {
		if (!sub_tasks[type]) {
			throw new Error('sub tasks type must be', _.keys(sub_tasks))
		}
		let flatten = _.flatten(sub_tasks[type], true) // shallow and deeply flatten tasks
		let params = _.compact(flatten) // clean the undefined tasks
		console.debug('run flatten:', ...params)
		gulp.run_sequence(..._.concat(params, cb))
	}


	if (argv.verbose < 1) {
		gutil.log = noop
	}

	// const plumber = require('gulp-plumber')
	// const gulp_src = gulp.src
	// gulp.src = function(...p) {
	// 	return gulp_src.apply(gulp, p).pipe(plumber(function(error) {
	// 		console.error('Error of', error.plugin, ':', error.message)
	// 		this.emit('end')
	// 	}))
	// }
}
function hack_gulp(argv, cmd) {
	require_alias('gulp', gulp)
	hack_gulp_attr(argv)
	// node index.js <cmd>
	let params = ['node', './index.js']
	// node index.js --cmd <cmd>
	params.push('--cmd', cmd)
	// node index.js --cmd <cmd> --gulpfile ./gulpfile.js
	params.push('--gulpfile', argv.gulpfile ? argv.gulpfile : `${__dirname}/../lib/gulpfile.js`)
	// node index.js --cmd <cmd> --gulpfile ./gulpfile.js --cwd ${process.cwd()}
	params.push('--cwd', process.cwd())

	if (argv.color) {
		params.push('--color')
	}

	let clone = _.clone(process.argv)
	process.argv = params
	console.debug(params.join(' '))
	require('gulp/bin/gulp.js')
	process.argv = clone
}

let alias = {}
function require_alias(name, content) {
	if (alias[name]) {
		throw new Error(`${name} is already existent`)
	}
	alias[name] = content
}
function requirer(path) {
	let file = alias[path] || path
	// console.trace('require', file)
	if (file instanceof Object) {
		return file
	}
	return this.constructor._load(file, this)
}
function hack_require() {
	module.constructor.prototype.require_alias = require_alias
	module.constructor.prototype.require = requirer
}

exports.noop = noop
exports.console = hack_console
exports.gulp = hack_gulp
exports.require = hack_require
