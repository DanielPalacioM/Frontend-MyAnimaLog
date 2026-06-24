import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface PetDocument {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  date: string;   // ej: "Ene 2026"
  url?: string;
}

@Component({
  selector: 'app-documents-section',
  templateUrl: './documents-section.component.html',
  styleUrls: ['./documents-section.component.scss'],
  standalone: false
})
export class DocumentsSectionComponent {
  @Input() documents: PetDocument[] = [];

  @Output() viewAll = new EventEmitter<void>();
  @Output() upload = new EventEmitter<void>();
  @Output() docClick = new EventEmitter<PetDocument>();

  onViewAll() { this.viewAll.emit(); }
  onUpload() { this.upload.emit(); }
  onDocClick(doc: PetDocument) { this.docClick.emit(doc); }
}