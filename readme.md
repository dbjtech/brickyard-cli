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
  ls [plan..]                        Get the plan list of brickyard_modules
  build <plan..>                     Build one or more plans
  run [dir]                          Run a brickyard app
  test <plan..>                      Test modules of plans
  create-module <type> <dir> [name]  Create a brickyard module with name to the
                                     dir
  build-docker <plan...>             Create a dockerfile for the plan and build
                                     with docker

Options:
  --version            Show version number                             [boolean]
  --help               Show help                                       [boolean]
  --verbose, -v        Log level. 0: INFO, 1: DEBUG, 2: TRACE
                                                            [count] [default: 0]
  --brickyard_modules  Path of brickyard_modules folder
                                                [default: "./brickyard_modules"]
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

### brickyard build-docker plan
Create a dockerfile and then run docker build. Your brickyard app will build in two docker containers.
One for building, another for deploying or running.

options
- --expose: Expose port for dockerfile
- --tag: Name the docker image
- --only-dockerfile: Just write a dockerfile to output

### other options
- --help: Show usage info
- --color: Log with color
- --verbose, -v: Log level. 0: INFO, 1: DEBUG, 2: TRACE
- --brickyard_modules: Path of brickyard_modules folder. [default: "./brickyard_modules"]
- --config: Path of config.js. [default: "./config.js"]
