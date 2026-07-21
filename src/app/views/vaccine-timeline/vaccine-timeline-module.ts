import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { VaccineTimelineRoutingModule } from './vaccine-timeline-routing-module';
import { VaccineTimelineComponent } from './vaccine-timeline.page';

import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    VaccineTimelineComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    VaccineTimelineRoutingModule,
    SharedModule
  ]
})
export class VaccineTimelineModule {}