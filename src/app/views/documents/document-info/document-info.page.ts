import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentService } from 'src/app/services/DocumentService/document-service/document-service';
import { PetDocument, DocumentType } from 'src/app/models/pet-document.model';

@Component({
  selector: 'app-document-info',
  templateUrl: './document-info.page.html',
  styleUrls: ['./document-info.page.scss'],
  standalone: false
})
export class DocumentInfoPage implements OnInit {

  petId = '';
  docId = '';
  doc: PetDocument | null = null;
  loading = true;
  deleting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService
  ) {}

  ngOnInit() {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
    this.docId = this.route.snapshot.paramMap.get('docId') || '';
    if (!this.petId || !this.docId) return;
    this.loadDoc();
  }

  private loadDoc() {
    this.loading = true;
    this.documentService.getDocumentById(this.petId, this.docId).subscribe({
      next: (doc) => {
        this.doc = doc;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando documento:', err);
        this.loading = false;
      }
    });
  }

  get fileName(): string {
    if (!this.doc?.fileUrl) return '';
    const parts = this.doc.fileUrl.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  }

  isPdf(): boolean {
    return this.doc?.mimeType === 'application/pdf';
  }

  typeLabel(): string {
    if (!this.doc) return '';
    const map: Record<DocumentType, string> = {
      VACCINE: 'Vacuna',
      MEDICAL_RECORD: 'Historial',
      PRESCRIPTION: 'Receta',
      LAB_RESULT: 'Lab',
      SURGERY_REPORT: 'Cirugía',
      DEWORMING: 'Desparasitación',
      ALLERGY_REPORT: 'Alergia',
      OTHER: 'Otro',
    };
    return map[this.doc.documentType] || this.doc.documentType;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatSize(bytes: number): string {
    if (!bytes) return '';
    const kb = bytes / 1024;
    return kb < 1024 ? `${Math.round(kb)}KB` : `${(kb / 1024).toFixed(1)}MB`;
  }

  onDownload() {
    if (!this.doc) return;
    this.documentService.getDownloadUrl(this.petId, this.doc.id).subscribe({
      next: (res) => window.open(res.downloadUrl, '_blank'),
      error: (err) => {
        console.error('❌ Error obteniendo URL de descarga:', err);
        alert('No se pudo descargar el documento.');
      }
    });
  }

  onShare() {
    if (!this.doc) return;
    this.documentService.getDownloadUrl(this.petId, this.doc.id).subscribe({
      next: (res) => {
        if (navigator.share) {
          navigator.share({ title: this.doc!.title, url: res.downloadUrl }).catch(() => {});
        } else {
          navigator.clipboard.writeText(res.downloadUrl);
          alert('Enlace copiado al portapapeles.');
        }
      },
      error: (err) => console.error('❌ Error compartiendo documento:', err)
    });
  }

  onDelete() {
    if (!this.doc || this.deleting) return;
    if (!confirm('¿Eliminar este documento? Esta acción no se puede deshacer.')) return;

    this.deleting = true;
    this.documentService.deleteDocument(this.petId, this.doc.id).subscribe({
      next: () => {
        this.deleting = false;
        this.router.navigate(['/pets', this.petId, 'documents'], { replaceUrl: true });
      },
      error: (err) => {
        this.deleting = false;
        console.error('❌ Error eliminando documento:', err);
        alert('No se pudo eliminar el documento.');
      }
    });
  }

  goBack() {
    history.back();
  }
}