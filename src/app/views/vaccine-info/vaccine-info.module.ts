import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VaccineInfoPageRoutingModule } from './vaccine-info-routing.module';

import { VaccineInfoPage } from './vaccine-info.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VaccineInfoPageRoutingModule,
    SharedModule
  ],
  declarations: [VaccineInfoPage]
})
export class VaccineInfoPageModule {}
