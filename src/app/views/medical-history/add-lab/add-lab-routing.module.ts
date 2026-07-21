import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddLabPage } from './add-lab.page';

const routes: Routes = [
  {
    path: '',
    component: AddLabPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddLabPageRoutingModule {}
