const _ = require('lodash')

const gulp = require('gulp')
const del = require('del')
const Bluebird = require('bluebird')

const mergeStream = require('merge-stream')
const runSequence = require('run-sequence')
const brickyard = require('./brickyard')

gulp.del = del
gulp.merge = mergeStream
gulp.run_sequence = runSequence
gulp.create_tasks = (group) => {
	_.each(group, (task, id) => {
		gulp.task(id, task)
	})
}

const subTasks = { build: [], run: [], test: [], watch: [] }

gulp.register_sub_tasks = (type, priority, taskName) => {
	if (!subTasks[type]) {
		throw new Error('sub tasks type must be', _.keys(subTasks))
	}

	if (!subTasks[type][priority]) {
		subTasks[type][priority] = taskName
	} else {
		subTasks[type][priority] = _.flatten([subTasks[type][priority], taskName])
	}
}

const runSequenceAsync = Bluebird.promisify(runSequence)

gulp.runFlatten = (...types) => {
	const tasks = []
	_.each(types, (type) => {
		if (!subTasks[type]) {
			throw new Error('sub tasks type must be', _.keys(subTasks))
		}
		tasks.push(subTasks[type])
	})
	console.debug('run flatten:', ...tasks)
	return runSequenceAsync(...tasks)
}

const alias = {}

function requireAlias(name, content) {
	if (alias[name]) {
		throw new Error(`${name} is already existent`)
	}
	alias[name] = content
}

function requirer(path) {
	const file = alias[path] || path

	// console.trace('require', file)
	if (file instanceof Object) {
		return file
	}
	return this.constructor._load(file, this) // eslint-disable-line no-underscore-dangle
}

module.constructor.prototype.require_alias = requireAlias
module.constructor.prototype.require = requirer

module.require_alias('brickyard', brickyard)
