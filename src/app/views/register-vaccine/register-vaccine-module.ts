import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RegisterVaccineRoutingModule } from './register-vaccine-routing-module';
import { RegisterVaccineComponent } from './register-vaccine.component';

@NgModule({
  declarations: [RegisterVaccineComponent],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RegisterVaccineRoutingModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RegisterVaccineModule {}