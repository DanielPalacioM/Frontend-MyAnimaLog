import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Componentes existentes
import { InputComponent } from './components/input/input.component';
import { ButtonComponent } from './components/button/button.component';

// Nuevos componentes
import { AvatarComponent } from './components/avatar/avatar.component';
import { MenuItemComponent } from './components/menu-item/menu-item.component';
import { TabBarComponent } from './components/tab-bar/tab-bar.component';

@NgModule({
  declarations: [
    InputComponent,
    ButtonComponent,
    AvatarComponent,
    MenuItemComponent,
    TabBarComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule
  ],
  exports: [
    InputComponent,
    ButtonComponent,
    AvatarComponent,
    MenuItemComponent,
    TabBarComponent
  ]
})
export class SharedModule {}