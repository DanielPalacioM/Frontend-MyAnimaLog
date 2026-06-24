import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PetProfilePageRoutingModule } from './pet-profile-routing.module';

import { PetProfilePage } from './pet-profile.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PetProfilePageRoutingModule,
    SharedModule
  ],
  declarations: [PetProfilePage]
})
export class PetProfilePageModule {}
