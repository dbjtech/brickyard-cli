import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import '@angular/platform-browser'
import '@angular/material'
import '@angular/cdk'
import 'hammerjs'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import '@angular/material/prebuilt-themes/indigo-pink.css'

import { ngxModuleCollector } from '@brickyard/ngx-module-collector'

@NgModule({
	imports: [BrowserAnimationsModule],
	exports: [FormsModule, BrowserAnimationsModule],
})
export class MaterialModule {}

ngxModuleCollector.registerNgModuleImports(MaterialModule)
