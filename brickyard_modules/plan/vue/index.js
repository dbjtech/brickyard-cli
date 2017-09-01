module.exports = {
	modules: [
		'buildtask/install',
		'buildtask/webpack/build',
		'buildtask/webpack/babel',
		'buildtask/webpack/common-shim',
		'buildtask/webpack/split-vendor',
		'buildtask/webpack/resource',
		'buildtask/webpack/css',
		'buildtask/webpack-vue',
		'buildtask/watch',

		'framework/webserver/webpack-dev-server',
		'framework-frontend/webpack/index-template',
	],
	config: {
		'buildtask-webpack-babel': {
			compileJS: true,
		},
	},
}
