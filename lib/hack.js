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

const subTasks = { build: [], run: [], watch: [], test: [] }

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

gulp.runFlatten = (type) => {
	if (!subTasks[type]) {
		throw new Error('sub tasks type must be', _.keys(subTasks))
	}
	console.debug(`Run Flatten : [${type}] : [${subTasks[type]}]`)
	if (subTasks[type].length > 0) {
		return runSequenceAsync(...subTasks[type])
	}
	return Bluebird.resolve()
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

	if (file instanceof Object) {
		return file
	}
	return this.constructor._load(file, this) // eslint-disable-line no-underscore-dangle
}

module.constructor.prototype.require_alias = requireAlias
module.constructor.prototype.require = requirer

module.require_alias('brickyard', brickyard)
