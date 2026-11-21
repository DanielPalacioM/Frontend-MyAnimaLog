import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AiChatPageRoutingModule } from './ai-chat-routing.module';
import { AiChatPage } from './ai-chat.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AiChatPageRoutingModule,
    SharedModule
  ],
  declarations: [AiChatPage]
})
export class AiChatPageModule {}
