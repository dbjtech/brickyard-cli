module.exports = {
	modules: [
		'buildtask/install',
		'buildtask/webpack/build',
		'buildtask/webpack/split-vendor',
		'buildtask/webpack/common-shim',
		'buildtask/webpack/css',
		'buildtask/webpack/resource',
		'buildtask/webpack-react',
		'buildtask/watch',

		'framework-frontend/webpack/index-template',
	],
	config: {
	},
}
