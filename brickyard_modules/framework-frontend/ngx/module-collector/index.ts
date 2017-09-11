import * as _ from 'lodash'

class NgxModuleCollector {
	providers = []
	declarations = []
	imports = []
	exports = []
	entryComponents = []
	bootstrap = []
	schemas = []

	constructor() {
	}

	registerNgModuleProviders(...list) {
		_.pullAll(this.providers, list)
		this.providers.push(...list)
	}

	registerNgModuleDeclarations(...list) {
		_.pullAll(this.declarations, list)
		this.declarations.push(...list)
	}

	registerNgModuleImports(...list) {
		_.pullAll(this.imports, list)
		this.imports.push(...list)
	}

	registerNgModuleExports(...list) {
		_.pullAll(this.exports, list)
		this.exports.push(...list)
	}

	registerNgModuleEntryComponents(...list) {
		_.pullAll(this.entryComponents, list)
		this.entryComponents.push(...list)
	}

	registerNgModuleBootstrap(...list) {
		_.pullAll(this.bootstrap, list)
		this.bootstrap.push(...list)
	}

	registerNgModuleSchemas(...list) {
		_.pullAll(this.schemas, list)
		this.schemas.push(...list)
	}
}

export const ngxModuleCollector = new NgxModuleCollector()
