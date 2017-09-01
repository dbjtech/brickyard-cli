const _ = require('lodash')
const brickyard = require('brickyard')

const BRICKYARD_CHILD_PROCESS_RUN_AGAIN = 'brickyard-child-process-run-again' // see brickyard-cli

brickyard.ensureVersion('4.0.0-alpha')

const watchConfig = brickyard.argv.polling ? {
	usePolling: true,
	interval: typeof (brickyard.argv.polling) === 'number' ? brickyard.argv.polling : 1500,
} : {}


/**
 * 监听生成目录，一旦变更触发livereload插件的运行
 * @param cb
 */
brickyard.events.once('watch-output', () => {
	if (!brickyard.modules.buildtask['buildtask-build-browserify']) { return }
	const livereload = require('gulp-livereload')
	livereload.listen()
	require('chokidar').watch(`${brickyard.dirs.dest}/www/`, watchConfig)
		.on('change', _.debounce(path => livereload.changed(path), 500))
})

// rebuild if plan/buildtask/backend codes update
brickyard.events.once('watch-backend', () => {
	const mds = _.filter(brickyard.modules, md => ['plan', 'buildtask', 'backend'].indexOf(md.type) !== -1)
	const watchee = _.map(mds, md => `${md.path}/`)
	console.log('watch plan, buildtask and backend modules', watchee)

	const onChange = _.debounce((path) => {
		console.log('File Changed:', path)
		process.send(BRICKYARD_CHILD_PROCESS_RUN_AGAIN)
		process.exit(0)
	}, 500)
	require('chokidar').watch(watchee, watchConfig).on('change', onChange)
})

// rebuild if frontend codes update
brickyard.events.once('watch-frontend', () => {
	const mds = _.filter(brickyard.modules, md => ['frontend'].indexOf(md.type) !== -1)
	const watchee = _.map(mds, md => `${md.path}/`)
	console.log('watch frontend modules', watchee)

	const onChange = _.debounce((path) => {
		console.log('File Changed:', path)
		if (brickyard.modules.buildtask['buildtask-webpack-build']) {
			brickyard.buildModules({ keepDestFiles: true }).then(() => console.log('Rebuild finished'))
		} else {
			process.send(BRICKYARD_CHILD_PROCESS_RUN_AGAIN)
			process.exit(0)
		}
	}, 500)
	require('chokidar').watch(watchee, watchConfig).on('change', onChange)
})
