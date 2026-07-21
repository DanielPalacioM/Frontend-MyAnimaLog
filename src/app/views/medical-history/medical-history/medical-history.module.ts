import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicalHistoryPageRoutingModule } from './medical-history-routing.module';

import { MedicalHistoryPage } from './medical-history.page';

import { SharedModule } from 'src/app/shared/shared.module';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedicalHistoryPageRoutingModule,
    SharedModule
  ],
  declarations: [MedicalHistoryPage]
})
export class MedicalHistoryPageModule {}
