/*
 * 由于brickyard-cli用了async function，需要用node@^7.6.0或node7的harmony模式
 * 本模块用于使当前程序运行于harmony模式，注意事项
 * 1. 本模块通过child_process.spawn()方法实现
 * 2. 引入本模块前的模块，和引入本模块的当前模块，不能使用harmony语法
 * 3. 如果后续程序需要spawn或者fork子进程，需要加上--harmony参数(用默认值即可)，
 *    否则本模块检测到非harmony模式，会再spawn一个子进程
 */

const semver = require('semver')

if (semver.lt(process.version, '7.0.0')) {
	throw new Error('brickyard-cli needs node 7 or above')
}

if (semver.lt(process.version, '7.6.0') &&
	process.argv.indexOf('--harmony') === -1 &&
	process.execArgv.indexOf('--harmony') === -1
) {
	require('harmonize')() // eslint-disable-line global-require
}
