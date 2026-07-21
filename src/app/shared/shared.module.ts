import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { InputComponent } from './components/input/input.component';
import { ButtonComponent } from './components/button/button.component';
import { AvatarComponent } from './components/avatar/avatar.component';
import { MenuItemComponent } from './components/menu-item/menu-item.component';
import { TabBarComponent } from './components/tab-bar/tab-bar.component';
import { UpdateUsernameModalComponent } from './components/update-username-modal/update-username-modal.component';
import { PetCardComponent } from './components/pet-card/pet-card.component';
import { CalendarWidgetComponent } from './components/calendar-widget/calendar-widget.component';
import { PromoBannerComponent } from './components/promo-banner/promo-banner.component';
import { BottomSheetComponent } from './components/bottom-sheet/bottom-sheet.component';
import { LanguageSelectorComponent } from './components/language-selector/language-selector.component';
import { ThemeSelectorComponent } from './components/theme-selector/theme-selector.component';
import { NotificationCardComponent } from './components/notification-card/notification-card.component';
import { DatePipe } from '@angular/common';
import { PetCalendarComponent } from './components/pet-calendar/pet-calendar.component';
import { MedicalHistoryCardComponent } from './components/medical-history-card/medical-history-card.component';
import { PetStatsCardComponent } from './components/pet-stats-card/pet-stats-card.component';
import { VaccineCardComponent } from './components/vaccine-card/vaccine-card.component';
import { DocumentsSectionComponent } from './components/documents-section/documents-section.component';
import { VaccineTimelineCardComponent } from './components/vaccine-timeline-card/vaccine-timeline-card.component';

@NgModule({
  declarations: [
    InputComponent,
    ButtonComponent,
    AvatarComponent,
    MenuItemComponent,
    TabBarComponent,
    UpdateUsernameModalComponent,
    PetCardComponent,
    CalendarWidgetComponent,
    PromoBannerComponent,
    BottomSheetComponent,
    LanguageSelectorComponent,
    ThemeSelectorComponent,
    NotificationCardComponent,
    PetCalendarComponent,
    MedicalHistoryCardComponent,
    PetStatsCardComponent,
    VaccineCardComponent,
    DocumentsSectionComponent,
    VaccineTimelineCardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
  ],
  exports: [
    InputComponent,
    ButtonComponent,
    AvatarComponent,
    MenuItemComponent,
    TabBarComponent,
    UpdateUsernameModalComponent,
    PetCardComponent,
    CalendarWidgetComponent,
    PromoBannerComponent,
    BottomSheetComponent,
    LanguageSelectorComponent,
    ThemeSelectorComponent,
    NotificationCardComponent,
    DatePipe,
    PetCalendarComponent,
    MedicalHistoryCardComponent,
    PetStatsCardComponent,
    VaccineCardComponent,
    DocumentsSectionComponent,
    VaccineTimelineCardComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule {}