import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SharedProfilesHomePage } from './shared-profiles-home.page';

const routes: Routes = [
  {
    path: '',
    component: SharedProfilesHomePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SharedProfilesHomePageRoutingModule {}
