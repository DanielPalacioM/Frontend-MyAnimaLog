import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { VaccineTimelineComponent } from './vaccine-timeline.page';

const routes: Routes = [
  {
    path: '',
    component: VaccineTimelineComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VaccineTimelineRoutingModule {}