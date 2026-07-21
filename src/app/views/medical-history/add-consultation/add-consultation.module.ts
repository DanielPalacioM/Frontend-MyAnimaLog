import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddConsultationPageRoutingModule } from './add-consultation-routing.module';

import { AddConsultationPage } from './add-consultation.page';

import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddConsultationPageRoutingModule,
    SharedModule
  ],
  declarations: [AddConsultationPage]
})
export class AddConsultationPageModule {}
