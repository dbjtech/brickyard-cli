const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const gulp = require('gulp')
const glob = require('glob')
const npm = require('./npm.js')
const fnm = require('find-node-modules')
const jsonEditor = require('gulp-json-editor')
const brickyard = require('brickyard')

brickyard.ensureVersion('4.0.0-alpha')

let cache = {}
let atomicTasks = {
	/**
	 * 导出 package.json 文件到生成目录
	 * 其中涉及到将 收集到的插件依赖数据 与 根目录的 package.json 合并
	 * @returns {*|{delay}}
	 */
	export_npm_config: function() {
		let config_path = brickyard.getPackageJsonPath()
		let config = brickyard.getPackageJson()
		let config_gen = (json) => {
			_.extend(json, config)
			return json
		}

		return gulp.src(config_path)
			.pipe(jsonEditor(config_gen || config))
			.pipe(gulp.dest(brickyard.dirs.dest))
	},

	/**
	 * 导出 bower.json 文件到生成目录
	 * 其中涉及到将 收集到的前端模块 bower 依赖数据 与 根目录的 bower.json 合并
	 * @returns {*|{delay}}
	 */
	export_bower_config: function () {
		let config_path = brickyard.getBowerJsonPath()
		let config = brickyard.getBowerJson()
		return gulp.src(config_path)
			.pipe(jsonEditor(config))
			.pipe(gulp.dest(brickyard.dirs.dest))
	},
	/**
	 * 检查已安装的npm modules
	 */
	npm_check_installed_npm_packages: function () {
		let config = get_config('package.json')
		_.extend(config.dependencies, config.devDependencies)

		cache.installed_npm_packages = []

		// 获取所有 node-modules 目录路径
		let paths = fnm()
		for (let key of _.keys(config.dependencies)) {
			for (let p of paths) {
				let _path = path.join(p, key)

				if (fs.existsSync(_path)) {
					console.debug('npm exists', _path)
					cache.installed_npm_packages.push(key)
					break
				}
			}
		}
	},
	/**
	 * 检查已安装的 bower components
	 */
	npm_check_installed_bower_packages: function () {
		let config = get_config('bower.json')
		cache.installed_bower_packages = []
		for (let key of _.keys(config.dependencies)) {
			let _path = `${brickyard.dirs.bower}/${key}`
			let exist_inner = fs.existsSync(_path)

			if (exist_inner) {
				let existed = fs.existsSync(`${_path}/bower.json`) ||
					fs.existsSync(`${_path}/package.json`) ||
					glob.sync(`${_path}/**/*.js`).length !== 0

				if (!existed) {
					console.warn(`${_path} is not well installed`)
				} else {
					cache.installed_bower_packages.push(key)
				}
			}
		}
	},
	/**
	 * 安装 合成的package.json 已声明但缺失的 node_modules
	 * @param cb
	 * @returns {*}
	 */
	npm_install: () => {
		const config = get_config('package.json')
		_.extend(config.dependencies, config.devDependencies)

		let dependencies = _.difference(_.keys(config.dependencies), cache.installed_npm_packages)

		if (!dependencies.length) {
			gulp.plugins = require('gulp-load-plugins')({ config })
			return
		}

		dependencies = _.map(_.pick(config.dependencies, dependencies), get_joiner('@'))
		console.log('npm install', dependencies)

		const registry = brickyard.argv.registry ? `--registry ${brickyard.argv.registry}` : ''
		npm.install([registry, ...dependencies])
		gulp.plugins = require('gulp-load-plugins')({ config })
	},
	/**
	 * 安装 合成的bower.json 已声明但缺失的 node_modules
	 * @param cb
	 * @returns {*}
	 */
	bower_install: function (cb) {
		let config = get_config('bower.json')
		let dependencies = _.difference(_.keys(config.dependencies), cache.installed_bower_packages)

		if (!dependencies.length) {
			return cb()
		}

		dependencies = _.map(_.pick(config.dependencies, dependencies), get_joiner('#'))
		console.log('bower install', brickyard.dirs.dest, dependencies)

		const bower = require('bower')
		bower.commands.install(dependencies, { forceLatest: true }, {
			cwd: brickyard.dirs.dest,
			offline: brickyard.argv.offline,
		})
		.on('log', function(log) {
			console.debug(`[${log.id}]`, log.message)
		})
		.on('error', function(err) {
			cb(err)
		})
		.on('prompt', function(prompts /* , callback */) {
			console.log('prompts', prompts)
			// inquirer.prompt(prompts, callback)
		})
		.on('end', function(/* installed_npm_packages */) {
			// console.log('bower install end', installed_npm_packages)
			cb()
		})
	},

	copy_starter_to_dest: () => gulp.src(`${__dirname}/starter/index.js`).pipe(gulp.dest(brickyard.dirs.dest)),

	clean_buildtask_and_plan: () => {
		const fse = require('fs-extra')
		if (!brickyard.argv.debug && !brickyard.argv.watch) {
			fse.removeSync(path.join(brickyard.dirs.modules, 'buildtask'))
			fse.removeSync(path.join(brickyard.dirs.modules, 'plan'))
			fse.removeSync(path.join(brickyard.dirs.dest, 'bower.json'))
		}
	},
}

const composedTasks = {
	install_dependencies: (cb) => {
		gulp.run_sequence('export_npm_config', 'export_bower_config',
			'npm_check_installed_npm_packages', 'npm_check_installed_bower_packages',
			'npm_install', 'bower_install', 'npm_check_installed_bower_packages', 'copy_starter_to_dest', cb)
	},
}

gulp.create_tasks(atomicTasks)
gulp.create_tasks(composedTasks)
gulp.register_sub_tasks('build', 0, 'install_dependencies')
gulp.register_sub_tasks('build', 40, 'clean_buildtask_and_plan')

/**
 * 获取 生成目录下 对应名称的文件（主要是*.json）
 * @param fileName
 * @returns {*}
 */
function get_config(fileName) {
	if (cache[fileName]) {
		return cache[fileName]
	}

	cache[fileName] = JSON.parse(fs.readFileSync(`${brickyard.dirs.dest}/${fileName}`))
	return cache[fileName]
}

/**
 * 返回依赖数据合成器，用于合成对象某个属性的键值的字符串
 * 例如 k = 'angular' v = '1.4.3' => 'angular@1.4.3'
 *
 * @param sep
 * @returns {Function}
 */
function get_joiner(sep) {
	return (v, k) => {
		if (/(https?|git):/.test(v)) {
			return v
		}
		return v.indexOf(sep) === -1 ? k + sep + v : v
	}
}
