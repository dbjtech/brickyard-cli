const path = require('path')
const fs = require('fs')
/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved */
/* eslint-disable global-require, no-param-reassign */
const gulp = require('gulp')

const brickyard = require('brickyard')

const wwwDir = `${brickyard.dirs.dest}/www`

/**
 * 将每一个前端依赖声明的 main 入口注入 shim 对象，
 * 以便 browserify 打包代码时可以引入对应代码
 *
 * @param shim 被注入数据shim对象
 * @param dependencies 前端依赖集
 */
function setShim(shim, dependencies) {
	Object.keys(dependencies).forEach((key) => {
		const plugin = dependencies[key]
		// only use main defined plugins
		if (plugin.main) {
			const mainPath = path.isAbsolute(plugin.mainDest)
				? plugin.mainDest
				: path.join(brickyard.dirs.tempModules, plugin.mainDest)
			shim[key] = {
				path: mainPath,
				exports: null,
			}
		}
		// scan devDependencies declared in frontend modules' pakcage.json
		if (plugin.type !== 'frontend') {
			return
		}

		if (plugin.devDependencies) {
			Object.keys(plugin.devDependencies).forEach((pckName) => {
				if (shim[pckName]) {
					return
				}
				console.debug('Add frontend npm modules', pckName, 'for', key)
				shim[pckName] = {
					path: require.resolve(pckName),
					exports: null,
				}
			})
		}
	})
}

/**
 * 利用 arguments 来读取传入参数，第一个为被注入对象
 * 余下的参数数组（余参数组）前面都是可能多层嵌套的对象的 key，最后一个才是 value
 * 组装成配置对象。
 * i.e.
 * {
 *   key1: {
 *      key2: value
 *   }
 * }
 *
 * @returns {T|{}}
 */
function trySet(...args) { // obj,key1,key2,...,value
	if (args.length < 3) {
		throw new Error('not enough param')
	}

	const injectable = args.shift() || {}
	const value = args.pop()
	let obj = injectable

	// 循环组装嵌套对象
	for (let i = 0; i < args.length - 1; i += 1) {
		const key = args[i]
		obj[key] = obj[key] || {}
		obj = obj[key]
	}

	obj[args[args.length - 1]] = value

	return injectable
}

/**
 * 判断 bower.json 里面是否声明了对应依赖，以便注入可能的shim
 * @param name
 * @returns {boolean}
 */
function isDeclared(name) {
	return brickyard.bower.dependencies[name] || brickyard.npm.devDependencies[name]
}

/**
 * 对一些非CommonJS兼容的前端依赖进行shim配置
 *
 * @param shim
 */
function fixShim(shim) {
	const hasJquery = isDeclared('jquery')
	if (hasJquery) {
		trySet(shim, 'jquery', 'exports', '$')
	}

	if (isDeclared('angular')) {
		// trySet(shim, 'angular', 'exports', 'angular')
		if (hasJquery) {
			// load jquery before angular
			trySet(shim, 'angular', 'depends', { jquery: '$' })
		}
	}

	// socket.io-client @ qiji-portal,admin-common-request
	if (isDeclared('socket.io-client')) {
		const paths = ['/socket.io-client/dist/socket.io.js', '/socket.io-client/socket.io.js']
		for (let i = 0; i < paths.length; i += 1) {
			if (fs.existsSync(brickyard.dirs.bower + paths[i])) {
				trySet(shim, 'socket.io-client', { path: brickyard.dirs.bower + paths[i], exports: null })
				break
			}
		}
	}

	// qrcode @ admin-shop
	if (isDeclared('angular-qr')) {
		delete shim['qrcode.js']
		trySet(shim, 'angular-qr', 'depends', { angular: 'angular', qrcode: 'QRCode' })
		trySet(shim, 'qrcode', { path: `${brickyard.dirs.bower}/angular-qr/lib/qrcode.js`, exports: 'QRCode' })
	}

	// highcharts @ admin-statistic
	if (isDeclared('highcharts')) {
		trySet(shim, 'highcharts', 'exports', 'Highcharts')
		trySet(shim, 'highcharts-more', {
			path: `${brickyard.dirs.bower}/highcharts/highcharts-more.js`,
			exports: 'null',
		})
	}

	// messenger @ admin-sprite-battle
	if (isDeclared('messenger')) {
		trySet(shim, 'messenger', 'exports', 'Messenger')
	}

	// qiji-portal
	if (isDeclared('angular-strap')) {
		trySet(shim, 'angular-strap', { path: `${brickyard.dirs.bower}/angular-strap/fix/angular-strap.js`, exports: null })
		trySet(shim, 'angular-strap-tpl', {
			path: `${brickyard.dirs.bower}/angular-strap/dist/angular-strap.tpl.js`,
			exports: null,
		})
	}

	if (isDeclared('scrollmagic')) {
		trySet(shim, 'gasp.animation', {
			path: `${brickyard.dirs.bower}/scrollmagic/scrollmagic/uncompressed/plugins/animation.gsap.js`,
			exports: null,
		})
		trySet(shim, 'jquery.ScrollMagic', {
			path: `${brickyard.dirs.bower}/scrollmagic/scrollmagic/uncompressed/plugins/jquery.ScrollMagic.js`,
			exports: null,
		})
	}

	if (isDeclared('angular-i18n')) {
		trySet(shim, 'angular-locale_zh-cn', {
			path: `${brickyard.dirs.bower}/angular-i18n/angular-locale_zh-cn.js`,
			exports: null,
		})
	}

	if (isDeclared('blueimp-md5')) {
		trySet(shim, 'blueimp-md5', 'exports', 'md5')
	}

	if (isDeclared('angularjs-slider')) {
		trySet(shim, 'angularjs-slider', { path: `${brickyard.dirs.bower}/angularjs-slider/dist/rzslider.js`, exports: null })
	}

	if (isDeclared('animate.css')) {
		delete shim['animate.css']
	}

	if (isDeclared('ztree_v3')) {
		delete shim.ztree_v3
		trySet(shim, 'zTree', { path: `${brickyard.dirs.bower}/ztree_v3/js/jquery.ztree.all.js`, exports: null })
	}

	if (isDeclared('ui-navbar')) {
		trySet(shim, 'ui-navbar', { path: `${brickyard.dirs.bower}/ui-navbar/release/js/ui-navbar.js`, exports: null })
	}
}

// atomic tasks
gulp.create_tasks({
	/**
	 * 收集brickyard插件里所有html碎片代码，压缩并通过 angularTemplateCache 包装成
	 * 一个angular的module——'app.templates'，以便整合进打包文件
	 */
	bundle_templates: () => {
		const htmlmin = require('gulp-htmlmin')
		const angularTemplatecache = require('gulp-angular-templatecache')

		return gulp.src([`${brickyard.dirs.tempModules}/**/*.html`])
			.pipe(htmlmin({
				collapseWhitespace: true,
				conservativeCollapse: true,
			}))
			.pipe(angularTemplatecache({
				root: path.relative(brickyard.dirs.temp, brickyard.dirs.tempModules),
				module: 'app.templates',
				standalone: true,
				moduleSystem: 'Browserify',
			}))
			.pipe(gulp.dest(brickyard.dirs.tempModules))
	},
	/**
	 * 收集前端插件以及bower依赖的配置数据，收集shim数据
	 * 用 browserify 进行打包
	 * 非 debug 模式下 对 代码中 angular 的代码 进行 annotate
	 * 以保证代码压缩后 angular 的依赖注入特性能正确运行
	 *
	 *
	 * todo: 这里 shim 的处理 实在不优雅，需要优先重构
	 * @returns {*}
	 */
	browserify: () => {
		const browserify = require('gulp-browserify')
		const ngAnnotate = require('gulp-ng-annotate')
		const uglify = require('gulp-uglify')

		const shim = {
			'brickyard-plugins': { path: `${brickyard.dirs.tempModules}/main.js`, exports: null },
			templates: { path: `${brickyard.dirs.tempModules}/templates.js`, exports: null },
		}

		// scan bower components
		setShim(shim, brickyard.scanBowerModules())
		// scan brickyard plugins
		setShim(shim, brickyard.modules.frontend)
		// some fix
		fixShim(shim)

		Object.keys(shim).forEach((name) => {
			console.debug('%s : %j', name, shim[name])
		})

		const opt = brickyard.config.browserify || {}
		opt.shim = shim
		opt.debug = brickyard.config.debug && !brickyard.argv.nomap
		const p = gulp
			.src([`${brickyard.dirs.tempModules}/main.js`])
			.pipe(browserify(opt))

		if (!brickyard.config.debug) {
			p.pipe(ngAnnotate()).pipe(uglify())
		}

		return p.pipe(gulp.dest(wwwDir))
	},
})

// composed tasks
gulp.create_tasks({
	'build-browserify': (cb) => {
		if (!fs.existsSync(brickyard.dirs.temp)) {
			cb()
			return
		}

		gulp.run_sequence('bundle_templates', 'browserify', cb)
	},
})

gulp.register_sub_tasks('build', 30, 'build-browserify')
