import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddSurgeryPage } from './add-surgery.page';

const routes: Routes = [
  {
    path: '',
    component: AddSurgeryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddSurgeryPageRoutingModule {}
