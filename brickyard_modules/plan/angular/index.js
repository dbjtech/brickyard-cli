module.exports = {
	modules: [
		'buildtask/install',
		'buildtask/webpack/build',
		'buildtask/webpack/split-vendor',
		'buildtask/webpack/resource',
		'buildtask/webpack-angular2',
		'buildtask/watch',

		'framework/webserver/webpack-dev-server',
		'framework-frontend/angular2/common',
		'framework-frontend/webpack/index-template',
	],
	config: {
	},
}
