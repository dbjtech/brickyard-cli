const brickyard = require('brickyard-cli/lib/brickyard')
const hack = require('brickyard-cli/lib/hack')

hack.logWithLevel(0) // INFO

brickyard.ensureVersion('4.2.0')
brickyard.loadRuntime({ dir: __dirname })
	.then(() => brickyard.sendSignals('run'))
	.catch((e) => {
		console.error(e.stack)
		process.exit(1)
	})
