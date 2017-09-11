module.exports = {
	modules: [
		'buildtask/install',
		'buildtask/webpack/build',
		'buildtask/webpack/split-vendor',
		'buildtask/webpack/resource',
		'buildtask/webpack/css',
		'buildtask/webpack-angular2',
		'buildtask/watch',

		'framework/webserver/webpack-dev-server',
		'framework-frontend/ngx',
		'framework-frontend/webpack/index-template',
	],
	config: {
	},
}
