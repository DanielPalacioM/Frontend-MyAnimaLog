import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DocumentInfoPageRoutingModule } from './document-info-routing.module';

import { DocumentInfoPage } from './document-info.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DocumentInfoPageRoutingModule
  ],
  declarations: [DocumentInfoPage]
})
export class DocumentInfoPageModule {}
