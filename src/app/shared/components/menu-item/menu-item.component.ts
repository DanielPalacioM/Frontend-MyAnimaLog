import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-menu-item',
  templateUrl: './menu-item.component.html',
  styleUrls: ['./menu-item.component.scss'],
  standalone:false
})
export class MenuItemComponent {
  @Input() icon: string = '';
  @Input() label: string = '';
  @Input() isLogout: boolean = false;
  @Input() suffix: string = '';
  @Output() clicked = new EventEmitter<void>();

  onClick() {
    this.clicked.emit();
  }
}