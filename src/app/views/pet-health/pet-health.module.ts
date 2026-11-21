import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from 'src/app/shared/shared.module';
import { PetHealthRoutingModule } from './pet-health-routing.module';
import { HealthPage } from './health/health.page';
import { DewormingPage } from './deworming/deworming.page';
import { RegisterDewormingPage } from './register-deworming/register-deworming.page';

@NgModule({
  declarations: [HealthPage, DewormingPage, RegisterDewormingPage],
  imports: [CommonModule, FormsModule, IonicModule, PetHealthRoutingModule, SharedModule],
})
export class PetHealthModule {}
