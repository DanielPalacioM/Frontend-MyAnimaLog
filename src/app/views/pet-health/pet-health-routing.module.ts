import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HealthPage } from './health/health.page';
import { DewormingPage } from './deworming/deworming.page';
import { RegisterDewormingPage } from './register-deworming/register-deworming.page';

// Se monta en `pet-health/:petId`.
const routes: Routes = [
  { path: '', component: HealthPage },
  { path: 'deworming', component: DewormingPage },
  { path: 'deworming/new', component: RegisterDewormingPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PetHealthRoutingModule {}
