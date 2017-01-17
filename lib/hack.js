const console = require('./logger')
const _ = require('lodash')

const gulp = require('gulp')
const del = require('del')
const merge_stream = require('merge-stream')
const run_sequence = require('run-sequence')

gulp.del = del
gulp.merge = merge_stream
gulp.run_sequence = run_sequence
gulp.create_tasks = function (group) {
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

gulp.run_flatten = function (...arg) {
	let cb = arg.pop()
	let tasks = []
	_.each(arg, (type) => {
		if (!sub_tasks[type]) {
			throw new Error('sub tasks type must be', _.keys(sub_tasks))
		}
		tasks.push(sub_tasks[type])
	})
	let flatten = _.flatten(tasks, true) // shallow and deeply flatten tasks
	let params = _.compact(flatten) // clean the undefined tasks
	console.debug('run flatten:', ...params)
	gulp.run_sequence(..._.concat(params, cb))
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

module.constructor.prototype.require_alias = require_alias
module.constructor.prototype.require = requirer
