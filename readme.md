# CLI for Brickyard
Command Line Interface for Brickyard.

## Install
```bash
npm i -g brickyard-cli
```

## Usage
```bash
<cmd> [args]

Commands:
  ls [plan...]     Get the plan list of brickyard_modules
  build <plan...>  Build one or more plans
  test <plan...>   Test one or more plans
  run <dir>        Run a brickyard app

Options:
  --help               Show help                                       [boolean]
  --color              Log with color                                  [boolean]
  --debug              Use debug mode to build a plan                  [boolean]
  --brickyard_modules  Path of brickyard_modules folder
                                                [default: "./brickyard_modules"]
  --config             Path of config.js                [default: "./config.js"]
  --output, -o         Path of config.js                   [default: "./output"]
  --dir                Path of the brickyard app for run         [default: "./"]
  -v, --verbose        Log level. 0: INFO, 1: DEBUG, 2: TRACE            [count]
```

### brickyard ls
Display a list of modules for the brickyard_modules directory.

You will get a plan list which is available to build.

### brickyard ls plan
Display a list of modules for the specified plan.

### brickyard build plan
Build a plan.

options
- --debug: Use debug mode to build a plan.
- --output, -o: Path of config.js. [default: "./output"]

### brickyard run dir
Run a built brickyard program.

options
- --dir: Path of the brickyard app for run. [default: "./"]

### other options
- --help: Show usage info
- --color: Log with color
- --verbose, -v: Log level. 0: INFO, 1: DEBUG, 2: TRACE
- --brickyard_modules: Path of brickyard_modules folder. [default: "./brickyard_modules"]
- --config: Path of config.js. [default: "./config.js"]
