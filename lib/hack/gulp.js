const _ = require('lodash')
const gulp = require('gulp')
const Bluebird = require('bluebird')
const runSequence = require('run-sequence')

const runSequenceAsync = Bluebird.promisify(runSequence)

gulp.run_sequence = runSequence
gulp.create_tasks = (group) => {
	_.each(group, (task, id) => {
		gulp.task(id, task)
	})
}

const subTasks = { build: [], run: [], test: [] }

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

gulp.runFlatten = async (type) => {
	if (!subTasks[type]) {
		throw new Error('sub tasks type must be', _.keys(subTasks))
	}
	const tasks = subTasks[type].filter(task => !!task)
	console.debug(`Run Flatten : [${type}] : [${tasks}]`)
	if (tasks.length > 0) {
		await runSequenceAsync(...tasks)
	}
}
