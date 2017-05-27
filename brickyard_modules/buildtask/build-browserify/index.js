'use strict'

const path = require('path')
const fs = require('fs')
const gulp = require('gulp')
const brickyard = require('brickyard')
const _ = require('lodash')

const www_dir = `${brickyard.dirs.dest}/www`

// atomic tasks
gulp.create_tasks({
	/**
	 * 收集brickyard插件里所有html碎片代码，压缩并通过 angularTemplateCache 包装成
	 * 一个angular的module——'app.templates'，以便整合进打包文件
	 */
	bundle_templates: function () {
		return gulp.src([`${brickyard.dirs.tempModules}/**/*.html`])
			.pipe(gulp.plugins.htmlmin({
				collapseWhitespace: true,
				conservativeCollapse: true
			}))
			.pipe(gulp.plugins.angularTemplatecache({
				root: path.relative(brickyard.dirs.temp, brickyard.dirs.tempModules),
				module: 'app.templates',
				standalone: true,
				moduleSystem: 'Browserify'
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
	browserify: function () {
		let bower_plugins = brickyard.scanBowerModules()
		let frontend_plugins = brickyard.modules.frontend
		_.each(frontend_plugins, (md) => { md.mainDest = path.join(brickyard.dirs.tempModules, md.mainDest) })

		let shim = {
			'brickyard-plugins': { path: `${brickyard.dirs.tempModules}/main.js`, exports: null },
			templates: { path: `${brickyard.dirs.tempModules}/templates.js`, exports: null }
		}

		// scan bower components
		set_shim(shim, bower_plugins)
		// scan brickyard plugins
		set_shim(shim, frontend_plugins)
		// some fix
		fix_shim(shim)

		_.each(shim, function (s, name) {
			console.debug('%s : %j', name, s)
		})

		let opt = brickyard.config.browserify || {}
		opt.shim = shim
		opt.debug = brickyard.config.debug && !brickyard.argv.nomap

		let p = gulp.src([`${brickyard.dirs.tempModules}/main.js`])
			.pipe(gulp.plugins.browserify(opt))

		if (!brickyard.config.debug) {
			p.pipe(gulp.plugins.ngAnnotate())
				.pipe(gulp.plugins.uglify())
				.on('error', err => {
					console.error(err)
				})
		}

		return p.pipe(gulp.dest(www_dir))
	}
})

// composed tasks
gulp.create_tasks({
	'build-browserify': function (cb) {
		if (!fs.existsSync(brickyard.dirs.temp)) {
			return cb()
		}

		gulp.run_sequence('bundle_templates', 'browserify', cb)
	}
})

gulp.register_sub_tasks('build', 30, 'build-browserify')

/**
 * 将每一个前端依赖声明的 main 入口注入 shim 对象，
 * 以便 browserify 打包代码时可以引入对应代码
 *
 * @param shim 被注入数据shim对象
 * @param dependencies 前端依赖集
 */
function set_shim(shim, dependencies) {
	_.each(dependencies, function (plugin, key) {
		// only use main defined plugins
		if (!plugin.main) {return}
		shim[key] = {
			path: plugin.mainDest || plugin.main,
			exports: null
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
function try_set() {// obj,key1,key2,...,value
	let args = Array.from(arguments)

	if (args.length < 3) {
		throw new Error('not enough param')
	}

	let injectable = args.shift() || {}
	let value = args.pop()
	let obj = injectable

	// 循环组装嵌套对象
	for (let i = 0; i < args.length - 1; i++) {
		let key = args[i]
		obj[key] = obj[key] || {}
		obj = obj[key]
	}

	obj[args[args.length - 1]] = value

	return injectable
}

let bower_json

/**
 * 判断 bower.json 里面是否声明了对应依赖，以便注入可能的shim
 * @param name
 * @returns {boolean}
 */
function is_declared(name) {
	// return fs.existsSync(path.join(brickyard.dirs.bower, name))
	return !!bower_json.dependencies[name]
}

/**
 * 对一些非CommonJS兼容的前端依赖进行shim配置
 *
 * @param shim
 */
function fix_shim(shim) {
	if (!bower_json) {
		bower_json = JSON.parse(fs.readFileSync(`${brickyard.dirs.dest}/bower.json`))
	}

	let has_jquery = is_declared('jquery')
	if (has_jquery) {
		try_set(shim, 'jquery', 'exports', '$')
	}

	if (is_declared('angular')) {
		try_set(shim, 'angular', 'exports', 'angular')
		if (has_jquery) {
			// load jquery before angular
			try_set(shim, 'angular', 'depends', { jquery: '$' })
		}
	}

	// socket.io-client @ qiji-portal,admin-common-request
	if (is_declared('socket.io-client')) {
		let paths = ['/socket.io-client/dist/socket.io.js', '/socket.io-client/socket.io.js']
		for (let i = 0; i < paths.length; i++) {
			if (fs.existsSync(brickyard.dirs.bower + paths[i])) {
				try_set(shim, 'socket.io-client', { path: brickyard.dirs.bower + paths[i], exports: null })
				break
			}
		}
	}

	// qrcode @ admin-shop
	if (is_declared('angular-qr')) {
		delete shim['qrcode.js']
		try_set(shim, 'angular-qr', 'depends', { angular: 'angular', qrcode: 'QRCode' })
		try_set(shim, 'qrcode', { path: `${brickyard.dirs.bower}/angular-qr/lib/qrcode.js`, exports: 'QRCode' })
	}

	// highcharts @ admin-statistic
	if (is_declared('highcharts')) {
		try_set(shim, 'highcharts', 'exports', 'Highcharts')
		try_set(shim, 'highcharts-more', { 
			path: `${brickyard.dirs.bower}/highcharts/highcharts-more.js`,
			exports: 'null',
		})
	}

	// messenger @ admin-sprite-battle
	if (is_declared('messenger')) {
		try_set(shim, 'messenger', 'exports', 'Messenger')
	}

	// qiji-portal
	if (is_declared('angular-strap')) {
		try_set(shim, 'angular-strap', { path: `${brickyard.dirs.bower}/angular-strap/fix/angular-strap.js`, exports: null })
		try_set(shim, 'angular-strap-tpl', {
			path: `${brickyard.dirs.bower}/angular-strap/dist/angular-strap.tpl.js`,
			exports: null
		})
	}

	if (is_declared('scrollmagic')) {
		try_set(shim, 'gasp.animation', {
			path: `${brickyard.dirs.bower}/scrollmagic/scrollmagic/uncompressed/plugins/animation.gsap.js`,
			exports: null
		})
		try_set(shim, 'jquery.ScrollMagic', {
			path: `${brickyard.dirs.bower}/scrollmagic/scrollmagic/uncompressed/plugins/jquery.ScrollMagic.js`,
			exports: null
		})
	}

	if (is_declared('angular-i18n')) {
		try_set(shim, 'angular-locale_zh-cn', {
			path: `${brickyard.dirs.bower}/angular-i18n/angular-locale_zh-cn.js`,
			exports: null
		})
	}

	if (is_declared('blueimp-md5')) {
		try_set(shim, 'blueimp-md5', 'exports', 'md5')
	}

	if (is_declared('angularjs-slider')) {
		try_set(shim, 'angularjs-slider', { path: `${brickyard.dirs.bower}/angularjs-slider/dist/rzslider.js`, exports: null })
	}

	if (is_declared('animate.css')) {
		delete shim['animate.css']
	}

	if (is_declared('ztree_v3')) {
		delete shim['ztree_v3']
		try_set(shim, 'zTree', { path: `${brickyard.dirs.bower}/ztree_v3/js/jquery.ztree.all.js`, exports: null })
	}

	if (is_declared('ui-navbar')) {
		try_set(shim, 'ui-navbar', { path: `${brickyard.dirs.bower}/ui-navbar/release/js/ui-navbar.js`, exports: null })
	}
}
