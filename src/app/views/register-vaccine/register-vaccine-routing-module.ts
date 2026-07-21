import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegisterVaccineComponent } from './register-vaccine.component';

const routes: Routes = [
  { path: '', component: RegisterVaccineComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RegisterVaccineRoutingModule {}