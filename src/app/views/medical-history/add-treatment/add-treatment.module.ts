import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddTreatmentPageRoutingModule } from './add-treatment-routing.module';

import { AddTreatmentPage } from './add-treatment.page';

import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddTreatmentPageRoutingModule,
    SharedModule
  ],
  declarations: [AddTreatmentPage]
})
export class AddTreatmentPageModule {}
