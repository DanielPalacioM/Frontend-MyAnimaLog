import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SharedProfilesPageRoutingModule } from './shared-profiles-routing.module';

import { SharedProfilesPage } from './shared-profiles.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedProfilesPageRoutingModule
  ],
  declarations: [SharedProfilesPage]
})
export class SharedProfilesPageModule {}
