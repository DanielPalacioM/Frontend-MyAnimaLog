import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddLabPageRoutingModule } from './add-lab-routing.module';

import { AddLabPage } from './add-lab.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddLabPageRoutingModule,
    SharedModule,
    
  ],
  declarations: [AddLabPage]
})
export class AddLabPageModule {}
