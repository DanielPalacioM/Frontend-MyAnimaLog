import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VetPageRoutingModule } from './vet-routing.module';

import { VetPage } from './vet.page';
import { VetLinkPage } from './vet-link/vet-link.page';
import { VetSharePage } from './vet-share/vet-share.page';
import { VetDetailPage } from './vet-detail/vet-detail.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VetPageRoutingModule,
    SharedModule
  ],
  declarations: [VetPage, VetLinkPage, VetSharePage, VetDetailPage]
})
export class VetPageModule {}
