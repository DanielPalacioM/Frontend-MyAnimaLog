import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { Router } from '@angular/router';
import { PetDocument } from 'src/app/models/pet-document.model';

@Component({
  selector: 'app-documents-section',
  templateUrl: './documents-section.component.html',
  styleUrls: ['./documents-section.component.scss'],
  standalone: false
})
export class DocumentsSectionComponent implements OnChanges {
  @Input() documents: PetDocument[] = [];
  @Input() petId!: string;

  @Output() viewAll = new EventEmitter<void>();
  @Output() upload = new EventEmitter<void>();
  @Output() docClick = new EventEmitter<PetDocument>();

  recentDocuments: PetDocument[] = [];

  constructor(private router: Router) {}

  ngOnChanges() {
    this.recentDocuments = [...this.documents]
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 2);
  }

  isPdf(doc: PetDocument): boolean {
    return doc.mimeType === 'application/pdf';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  onViewAll() {
    this.router.navigate(['/pets', this.petId, 'documents']);
  }

  onUpload() {
    this.router.navigate(['/pets', this.petId, 'documents', 'upload']);
  }

  onDocClick(doc: PetDocument) {
    this.router.navigate(['/pets', this.petId, 'documents', doc.id]);
  }
}