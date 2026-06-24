import { Component, Input, Output, EventEmitter } from '@angular/core';


@Component({
  selector: 'app-theme-selector',
  templateUrl: './theme-selector.component.html',
  styleUrls: ['./theme-selector.component.scss'],
  standalone:false
})
export class ThemeSelectorComponent {
  @Input() isOpen: boolean = false;
  @Input() currentTheme: string = 'light';
  @Output() themeConfirmed = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  confirm() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.themeConfirmed.emit(newTheme);
    this.closed.emit();
  }

  cancel() {
    this.closed.emit();
  }
}
