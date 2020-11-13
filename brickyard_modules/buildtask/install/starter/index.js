const brickyard = require('brickyard-cli/lib/brickyard')
const hack = require('brickyard-cli/lib/hack')
const yargs = require('yargs')

hack.logWithLevel(0) // INFO

brickyard.ensureVersion('4.2.0')
brickyard.loadRuntime({ dir: __dirname, ...yargs.argv })
brickyard.sendSignals('run')
