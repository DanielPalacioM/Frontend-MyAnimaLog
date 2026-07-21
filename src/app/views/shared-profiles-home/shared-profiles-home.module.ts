import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SharedProfilesHomePageRoutingModule } from './shared-profiles-home-routing.module';

import { SharedProfilesHomePage } from './shared-profiles-home.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedProfilesHomePageRoutingModule,
    SharedModule
  ],
  declarations: [SharedProfilesHomePage]
})
export class SharedProfilesHomePageModule {}
