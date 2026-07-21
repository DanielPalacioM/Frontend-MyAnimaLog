import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AddPetRoutingModule } from './add-pet-routing-module';
import { SharedModule } from 'src/app/shared/shared.module';

import { AddPetComponent } from './add-pet.component';
import { StepPhotoComponent } from './steps/step-photo/step-photo.component';
import { StepBasicInfoComponent } from './steps/step-basic-info/step-basic-info.component';
import { StepMedicalComponent } from './steps/step-medical/step-medical.component';

@NgModule({
  declarations: [
    AddPetComponent,
    StepPhotoComponent,
    StepBasicInfoComponent,
    StepMedicalComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    AddPetRoutingModule,
    SharedModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AddPetModule {}