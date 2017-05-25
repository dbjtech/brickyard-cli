const _ = require('lodash')
const gulp = require('gulp')
const mergeStream = require('merge-stream')
const runSequence = require('run-sequence')

const argv = require('../bin')
const logger = require('./logger')

logger.setLevel(argv.verbose)
logger.hackConsole()

gulp.merge = mergeStream
gulp.run_sequence = runSequence
gulp.create_tasks = (group) => {
	_.each(group, (task, id) => {
		gulp.task(id, task)
	})
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
