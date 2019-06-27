/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved, global-require */
const path = require('path')
const fs = require('fs')
const util = require('util')

const brickyard = require('brickyard')
const _ = require('lodash')
const gulp = require('gulp')
const jsonEditor = require('gulp-json-editor')
const fse = require('fs-extra')

const npm = require('./npm.js')

/**
 * 导出 package.json 文件到生成目录
 * 其中涉及到将 收集到的插件依赖数据 与 根目录的 package.json 合并
 * @returns {*|{delay}}
 */
function exportNpmConfig() {
	return gulp.src(brickyard.getPackageJsonPath())
		.pipe(jsonEditor(Object.assign(brickyard.getPackageJson(), {
			main: 'index.js',
			bin: {
				brickyard: 'index.js',
			},
		})))
		.pipe(gulp.dest(brickyard.dirs.dest))
}

const npmInstall = (() => {
	const existsAsync = util.promisify(fs.exists).bind(fs)

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

	/**
	 * 安装 合成的package.json 已声明但缺失的 node_modules
	 * @param cb
	 * @returns {*}
	 */
	return async () => {
		const config = brickyard.getPackageJson()
		const configDependencies = Object.assign(config.dependencies, config.devDependencies)
		const configDependenciesKeys = Object.keys(configDependencies)

		// 获取所有 node-modules 目录路径
		const installedDependenciesKeys = (await Promise.all(configDependenciesKeys.map(async (key) => {
			const modulePath = path.join('node_modules', key)

			const exists = await existsAsync(modulePath)
			if (exists) {
				console.debug('npm exists', modulePath)
			}
			return [key, exists]
		}))).filter(([, exists]) => !!exists).map(([key]) => key)

		const dependencies = _.difference(configDependenciesKeys, installedDependenciesKeys)

		if (dependencies.length) {
			const wrapConfigDependencies = _.map(configDependencies, getJoiner('@'))
			const registry = brickyard.argv.registry ? `--registry ${brickyard.argv.registry}` : ''
			npm.install([registry, '--no-save', '--no-prune', ...wrapConfigDependencies])
		} else {
			console.debug('npm all exists')
		}
	}
})()

function copyStarterToDest() {
	return gulp.src(`${__dirname}/starter/index.js`).pipe(gulp.dest(brickyard.dirs.dest))
}

async function cleanBuildtaskAndPlan() {
	if (!brickyard.argv.debug && !brickyard.argv.watch) {
		await Promise.all(
			['buildtask', 'frontend', 'plan'].map(dir => fse.remove(path.join(brickyard.dirs.modules, dir))),
		)
	}
}

gulp.create_tasks({
	installDependencies: gulp.parallel(npmInstall, exportNpmConfig, copyStarterToDest),
	cleanBuildtaskAndPlan,
})

gulp.register_sub_tasks('build', 0, 'installDependencies')
gulp.register_sub_tasks('build', 40, 'cleanBuildtaskAndPlan')
