const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const gulp = require('gulp')
const glob = require('glob')
const brickyard = require('brickyard')

const www_dir = `${brickyard.dirs.dest}/www`

// atomic tasks
gulp.create_tasks({
	/**
	 * 收集临时目录下所有(前端)插件的css文件地址，
	 * 用模板生成 browserify 打包 所需的入口文件的代码
	 * @`misc/template/main.js`
	 */
	build_entry: () => {
		// collect plugins' css
		const pathsCss = `${brickyard.dirs.tempModules}/**/*.css`
		const filesCss = glob.sync(pathsCss)

		for (const pathStr of filesCss) {
			const split = path.relative(brickyard.dirs.temp, pathStr).split(path.sep)
			const id = split[1]
			const plugin = brickyard.modules.frontend[id] || brickyard.bower_plugins[id]
			if (!plugin) {
				console.log(id, 'is not a plugin')
			} else {
				plugin.css = plugin.css || []
				const file = split.join('/')
				plugin.css.push(file)
				plugin.css = _.uniq(plugin.css)
			}
		}

		return gulp.src(path.join(__dirname, 'main.js'))
			.pipe(gulp.plugins.data((/* file */) => {
				// file.path = file.path.replace('.template','')
				const injection = {}
				_.each(brickyard.modules.frontend, (plugin, key) => {
					injection[key] = {
						id: key,
						css: plugin.css,
					}
				})
				return { plugins: injection }
			}))
			.pipe(gulp.plugins.template())
			.pipe(gulp.dest(brickyard.dirs.tempModules))
	},
	/**
	 * 将临时目录下指定的资源文件复制到发布目录 www 下
	 * 如果没有使用 browserify/webpack，js文件也算资源
	 */
	build_plugins_misc: () => {
		if (brickyard.modules.buildtask['buildtask-webpack-build']) {
			return null
		}
		const src = [`${brickyard.dirs.temp}/**/*.{css,map,gif,jpg,jpeg,png,ico,svg,woff,woff2,eot,ttf,xsd,wsdl,mp3,wav}`]
		if (!brickyard.modules.buildtask['buildtask-build-browserify']) {
			// if no browserify, just copy js files to www dir
			src.push(`${brickyard.dirs.temp}/**/*.js`)
		}

		return gulp.src(src, { base: brickyard.dirs.temp })
			.pipe(gulp.dest(www_dir))
	},
	/**
	 * 通过对项目声明的 html 入口模版文件进行字符串标志替换
	 * 来协助注入实时刷新脚本以及定义全局变量
	 *
	 * @returns {*|Object}
	 */
	build_misc_template_html: () => {
		const mergeStream = require('merge-stream')
		const template = brickyard.config.misc && brickyard.config.misc.template
		if (_.isEmpty(template)) {
			return null
		}

		const streams = []
		_.each(template, (task, dest) => {
			console.debug(dest, task)
			let p = gulp.src(task.template)
			if (brickyard.config.debug) {
				p = p.pipe(gulp.plugins.replace(/<!-- livereload -->/,
					`<script>
						var host = (location.host||'localhost').split(':')[0]
						document.write('<script src="http://'+host+':35729/livereload.js">'+'</'+'script>')
					</script>`))
			}

			if (task['index-page']) {
				const indexContent = fs.readFileSync(path.join(brickyard.dirs.tempModules, task['index-page']))
				p = p.pipe(gulp.plugins.replace(/<!-- index-page -->/, indexContent))
			}

			p.pipe(gulp.plugins.replace(/<!-- APP_DEBUG_MODE -->/g, brickyard.config.debug || ''))
				.pipe(gulp.plugins.replace(/<!-- WEBSERVER -->/, brickyard.argv.webserver || ''))
				.pipe(gulp.plugins.replace(/<!-- content -->/, task.content))
				.pipe(gulp.plugins.rename(dest))
				.pipe(gulp.dest(www_dir))
			streams.push(p)
		})
		return mergeStream(streams)
	},

	/**
	 * 将项目配置里面的 misc.others 对应的文件拷贝到生成目录
	 * @returns {*}
	 */
	build_misc_other: () => {
		const mergeStream = require('merge-stream')
		const others = brickyard.config.misc && brickyard.config.misc.others

		if (_.isEmpty(others)) {
			return null
		}

		const streams = []
		_.each(others, (val, dest) => {
			const src = others[dest]
			const steam = gulp.src(src)
				.pipe(gulp.dest(path.join(brickyard.dirs.dest, dest)))

			streams.push(steam)
		})

		return mergeStream(streams)
	},
})

function needBuildWWW() {
	return !_.isEmpty(brickyard.modules.frontend)
}

// composed tasks
gulp.create_tasks({
	'build-misc': (cb) => {
		if (!needBuildWWW()) {
			gulp.run_sequence('build_misc_template_html', 'build_misc_other', cb)
		} else {
			gulp.run_sequence('build_plugins_misc', 'build_entry', 'build_misc_template_html', 'build_misc_other', cb)
		}
	},
})

gulp.register_sub_tasks('build', 24, 'build-misc')
