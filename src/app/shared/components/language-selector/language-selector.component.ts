import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonIcon } from "@ionic/angular/standalone";

@Component({
  selector: 'app-language-selector',
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.scss'],
  standalone:false
})
export class LanguageSelectorComponent {
  @Input() isOpen: boolean = false;
  @Input() selectedLanguage: string = 'en';
  @Output() languageSelected = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  select(lang: string) {
    this.languageSelected.emit(lang);
    setTimeout(() => this.closed.emit(), 300);
  }

  close() {
    this.closed.emit();
  }
}