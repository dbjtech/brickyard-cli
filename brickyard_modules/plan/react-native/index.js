module.exports = {
	modules: [
		'buildtask/install',
		'buildtask/webpack/build',
		'buildtask/webpack/split-vendor',
		'buildtask/webpack/css',
		'buildtask/webpack/resource',
		'buildtask/webpack-react-native',
		'buildtask/watch',

		'framework/webserver/webpack-dev-server',
		'framework-frontend/react-native-web-polyfill',
		'framework-frontend/webpack/index-template',
	],
	config: {
	},
}
