# CLI for Brickyard [![Build Status](https://travis-ci.org/dbjtech/brickyard-cli.svg?branch=master)](https://travis-ci.org/dbjtech/brickyard-cli)
Command Line Interface for Brickyard.

## Install
```bash
npm i -g brickyard-cli
```

## Usage
```bash
<cmd> [args]

Commands:
  ls [plan...]                       Get the plan list of brickyard_modules
  build <plan...>                    Build one or more plans
  test <plan...>                     Test one or more plans
  run [dir]                          Run a brickyard app
  create-module <type> <dir> [name]  Create a brickyard module with name to the
                                     dir

Options:
  --help               Show help                                       [boolean]
  --color              Log with color                                  [boolean]
  --debug              Use debug mode to build a plan                  [boolean]
  --brickyard_modules  Path of brickyard_modules folder
                                                [default: "./brickyard_modules"]
  --config             Path of config.js                [default: "./config.js"]
  --output, -o         Path of output                   [default: "./output"]
  --dir                Path of the brickyard app for run or build        [default: "./output"]
  -v, --verbose        Log level. 0: INFO, 1: DEBUG, 2: TRACE            [count]
```

### brickyard --version
Show the version of current brickyard-cli.

### brickyard ls
Display a list of modules for the brickyard_modules directory.

You will get a plan list which is available to build.

### brickyard ls plan
Display a list of modules for the specified plan.

### brickyard build plan
Build a plan.

options
- --run: Run the program after build.
- --watch: Rebuild when files change.
- --debug: Use debug mode to build a plan.
- --output, -o: Path of build dir. [default: "./output"]

### brickyard run dir
Run a built brickyard program.

options
- --dir: Path of the brickyard app for run. [default: "./output"]

### brickyard create-module type dir name.
Create a brickyard module in the specified dir with a specified name and type.
After call, a directories path will be created.
And the package.json and index.js will be set for you.

options
- --type: Must be "frontend", "backend", "plan" or "buildtask".
- --dir: Path of the module directory.
- --name: Package name of the module. [default: basename(dir)]

### brickyard test plan
Run unit test for a plan. You can specify multi plans to run the unit tests. Example
```bash
mocha test mocha common-service-push
```

options
- --modules: Only test for the sepecified modules. Test all when empty. [default: test all modules]

### other options
- --help: Show usage info
- --color: Log with color
- --verbose, -v: Log level. 0: INFO, 1: DEBUG, 2: TRACE
- --brickyard_modules: Path of brickyard_modules folder. [default: "./brickyard_modules"]
- --config: Path of config.js. [default: "./config.js"]
