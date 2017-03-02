const url = require('url')
const brickyard = require('brickyard')
const _ = require('lodash')

let server

function getConfig() {
	let config = brickyard.config['webpack-dev-server'] || {}

	_.defaults(config, {
		host: '0.0.0.0',
		port: 8080,
	})
	if (!config.serverUrl) {
		config.serverUrl = url.format({
			protocol: config.https ? 'https' : 'http',
			hostname: config.host,
			port: config.port,
		})
	}
	return config
}

brickyard.events.on('build-webpack-config', (config) => {
	if (!brickyard.argv.debug) {
		return
	}
	const webpack = require('webpack')
	_.defaultsDeep(config, { plugins: [] })
	// no hash, ref to https://github.com/webpack/webpack-dev-server/issues/377
	config.output.filename = '[name].js'
	config.output.chunkname = '[name].js'
	config.entry.push(`webpack-dev-server/client?${getConfig().serverUrl}`)
	config.entry.push('webpack/hot/dev-server')
	config.plugins.push(new webpack.HotModuleReplacementPlugin())
})

brickyard.events.on('build-webpack-dev-server', (compiler) => {
	const WebpackDevServer = require('webpack-dev-server')
	const proxy = require('http-proxy-middleware')
	const morgan = require('morgan')

	let config = getConfig()
	console.trace('init webpack-dev-server@', config.serverUrl)
	server = new WebpackDevServer(compiler, {
		// Tell the webpack dev server from where to find the files to serve.
		// contentBase: config.serverUrl,
		colors: true,
		// publicPath: config.serverUrl,
		host: config.host,
		port: config.port,
		hot: true,
		https: config.https,
		stats: {
			assets: true,
			colors: true,
			version: true,
			hash: true,
			timings: true,
			chunks: false,
		},
	})

	server.use(morgan('dev'))

	if (config.apiProxy) {
		server.use(proxy(config.apiProxy.address, {
			target: config.apiProxy.host,
			ws: true,
			changeOrigin: true,
			secure: false,
		}))
	}
	server.use('/(\\w+/?)+', (req, res) => {
		console.log('redirect', req.baseUrl, 'to /')
		res.redirect('/')
	})
})

brickyard.events.on('watch-frontend', () => {
	let config = getConfig()
	server.listen(config.port, config.host, () => {
		console.log(`webpack-dev-server start@${config.host}:${config.port}`)
	})
})
