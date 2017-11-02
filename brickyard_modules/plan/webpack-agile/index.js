module.exports = {
	modules: [
		'buildtask/install',
		'buildtask/build-webpage',
		'buildtask/watch',
		'buildtask/webpack/babel',
		'buildtask/webpack/build',
		'buildtask/webpack/common-shim',
		'buildtask/webpack/css',
		'buildtask/webpack/resource',
		'buildtask/webpack/split-vendor',

		'framework-frontend/webpack/index-template',
		'framework/webserver/webpack-dev-server',
	],
	config: {
		'buildtask-webpack-babel': {
			compileJS: true,
		},
	},
}
