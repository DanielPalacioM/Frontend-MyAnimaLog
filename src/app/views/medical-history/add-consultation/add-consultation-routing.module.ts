import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddConsultationPage } from './add-consultation.page';

const routes: Routes = [
  {
    path: '',
    component: AddConsultationPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddConsultationPageRoutingModule {}
