import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SharedProfilesPage } from './shared-profiles.page';

const routes: Routes = [
  {
    path: '',
    component: SharedProfilesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SharedProfilesPageRoutingModule {}
