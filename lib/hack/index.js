const logger = require('@brickyard/logger')
require('./gulp')
require('./require')

module.exports = {
	logWithLevel: (level) => {
		logger.setLevel(level)
		logger.hackConsole()
	},
}
