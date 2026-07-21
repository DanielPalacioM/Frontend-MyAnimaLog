import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VaccineInfoPage } from './vaccine-info.page';

const routes: Routes = [
  {
    path: '',
    component: VaccineInfoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VaccineInfoPageRoutingModule {}
