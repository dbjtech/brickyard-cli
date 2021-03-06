/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved, global-require */
const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const gulp = require('gulp')
const fnm = require('find-node-modules')
const jsonEditor = require('gulp-json-editor')
const brickyard = require('brickyard')
const semver = require('semver')
const npm = require('./npm.js')

brickyard.ensureVersion('4.2.0')

const cache = {}

/**
 * 获取 生成目录下 对应名称的文件（主要是*.json）
 * @param fileName
 * @returns {*}
 */
function getConfig(fileName) {
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
function getJoiner(sep) {
	return (v, k) => {
		if (/(https?|git):/.test(v)) {
			return v
		}
		return v.indexOf(sep) === -1 ? k + sep + v : v
	}
}

const atomicTasks = {
	/**
	 * 导出 package.json 文件到生成目录
	 * 其中涉及到将 收集到的插件依赖数据 与 根目录的 package.json 合并
	 * @returns {*|{delay}}
	 */
	export_npm_config() {
		const configPath = brickyard.getPackageJsonPath()
		const config = brickyard.getPackageJson()
		config.main = 'index.js'
		config.bin = { brickyard: 'index.js' }

		return gulp.src(configPath)
			.pipe(jsonEditor(config))
			.pipe(gulp.dest(brickyard.dirs.dest))
	},

	/**
	 * 导出 bower.json 文件到生成目录
	 * 其中涉及到将 收集到的前端模块 bower 依赖数据 与 根目录的 bower.json 合并
	 * @returns {*|{delay}}
	 */
	export_bower_config() {
		return gulp.src(brickyard.getBowerJsonPath())
			.pipe(jsonEditor(brickyard.getBowerJson()))
			.pipe(gulp.dest(brickyard.dirs.dest))
	},

	/**
	 * 检查已安装的npm modules
	 */
	async npm_check_installed_npm_packages() {
		const config = getConfig('package.json')
		Object.assign(config.dependencies, config.devDependencies)

		// 获取所有 node_modules 目录路径
		cache.installed_npm_packages = _.chain(fnm())
			.map(
				(p) => _.map(
					config.dependencies,
					(v, key) => (fs.existsSync(path.join(p, key)) ? key : null),
				),
			)
			.flatten()
			.uniq()
			.compact()
			.value()
		console.debug('npm exists', cache.installed_npm_packages)
	},

	/**
	 * 安装 合成的package.json 已声明但缺失的 node_modules
	 * @param cb
	 * @returns {*}
	 */
	async npm_install() {
		const config = getConfig('package.json')
		Object.assign(config.dependencies, config.devDependencies)

		let dependencies = _.difference(Object.keys(config.dependencies), cache.installed_npm_packages)

		if (dependencies.length) {
			dependencies = _.map(_.pick(config.dependencies, dependencies), getJoiner('@'))
			console.log('npm install', dependencies)
			if (semver.gt(npm.version(), '5.0.0')) {
				// npm@^5.0.0 should install all deps
				dependencies = _.map(config.dependencies, getJoiner('@'))
			}

			const registry = brickyard.argv.registry ? `--registry ${brickyard.argv.registry}` : ''
			npm.install([registry, '--no-save', '--no-prune', ...dependencies])
		}

		gulp.plugins = require('gulp-load-plugins')({ config })
	},

	copy_starter_to_dest: () => gulp.src(`${__dirname}/starter/index.js`).pipe(gulp.dest(brickyard.dirs.dest)),

	async clean_buildtask_and_plan() {
		const fse = require('fs-extra')
		if (!brickyard.argv.debug && !brickyard.argv.watch) {
			fse.removeSync(path.join(brickyard.dirs.modules, 'buildtask'))
			fse.removeSync(path.join(brickyard.dirs.modules, 'plan'))
		}
	},
}

const composedTasks = {
	install_dependencies(cb) {
		gulp.run_sequence(
			'export_npm_config', 'npm_check_installed_npm_packages', 'npm_install',
			'copy_starter_to_dest',
			cb,
		)
	},
}

gulp.create_tasks(atomicTasks)
gulp.create_tasks(composedTasks)
gulp.register_sub_tasks('build', 0, 'install_dependencies')
gulp.register_sub_tasks('build', 40, 'clean_buildtask_and_plan')
