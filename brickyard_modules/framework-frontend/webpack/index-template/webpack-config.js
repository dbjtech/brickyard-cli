const HtmlWebpackPlugin = require('html-webpack-plugin')
const config = require('brickyard/config')['webpack-index-template'] || {}

module.exports = {
	plugins: [
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: `${__dirname}/index.html`,
			favicon: config.favicon,
		}),
	],
}
