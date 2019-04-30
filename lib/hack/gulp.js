const gulp = require('gulp')
const util = require('util')
const runSequence = require('gulp4-run-sequence')

const runSequenceAsync = util.promisify(runSequence)

gulp.run_sequence = runSequence
gulp.create_tasks = (group) => {
	Object.keys(group).forEach((id) => {
		gulp.task(id, group[id])
	})
}

const subTasks = { build: [], run: [], test: [] }

gulp.register_sub_tasks = (type, priority, taskName) => {
	if (!subTasks[type]) {
		throw new Error('sub tasks type must be', Object.keys(subTasks))
	}

	if (!subTasks[type][priority]) {
		subTasks[type][priority] = []
	}

	subTasks[type][priority].push(taskName)
}

async function runFlatten(type) {
	if (!subTasks[type]) {
		throw new Error('sub tasks type must be', Object.keys(subTasks))
	}
	const tasks = subTasks[type].filter(task => !!task)
	console.debug(`Run Flatten : [${type}] : [${tasks}]`)
	if (tasks.length > 0) {
		await runSequenceAsync(...tasks)
	}
}

module.exports = {
	runFlatten,
}
