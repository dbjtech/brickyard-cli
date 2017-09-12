import { NgModule, enableProdMode } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'
import { bootloader } from '@angularclass/hmr'

import { ngxModuleCollector } from '@brickyard/ngx-module-collector'

if (process.env && process.env.NODE_ENV === 'production') {
	enableProdMode()
}

setTimeout(() => {
	ngxModuleCollector.registerNgModuleImports(BrowserModule)

	@NgModule({
		providers: ngxModuleCollector.providers,
		declarations: ngxModuleCollector.declarations,
		imports: ngxModuleCollector.imports,
		exports: ngxModuleCollector.exports,
		entryComponents: ngxModuleCollector.entryComponents,
		bootstrap: ngxModuleCollector.bootstrap,
		schemas: ngxModuleCollector.schemas,
	})
	class AppModule {}

	platformBrowserDynamic().bootstrapModule(AppModule)
}, 0)
