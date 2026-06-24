import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-bottom-sheet',
  templateUrl: './bottom-sheet.component.html',
  styleUrls: ['./bottom-sheet.component.scss'],
  standalone:false
})
export class BottomSheetComponent {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Output() closed = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }
}