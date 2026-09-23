import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddSurgeryPageRoutingModule } from './add-surgery-routing.module';

import { AddSurgeryPage } from './add-surgery.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddSurgeryPageRoutingModule,
    SharedModule
  ],
  declarations: [AddSurgeryPage]
})
export class AddSurgeryPageModule {}
