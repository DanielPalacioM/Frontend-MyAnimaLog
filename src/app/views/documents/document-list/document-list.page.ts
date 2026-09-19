import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentService } from 'src/app/services/DocumentService/document-service/document-service';
import { PetService } from 'src/app/services/PetService/pet';
import { PetDocument, DocumentType } from 'src/app/models/pet-document.model';


type FilterTab = 'ALL' | DocumentType; // 👈 esta línea debe estar aquí, fuera de la clase

@Component({
  selector: 'app-document-list',
  templateUrl: './document-list.page.html',
  styleUrls: ['./document-list.page.scss'],
  standalone: false
})
export class DocumentListPage implements OnInit {

  petId = '';
  petName = '';
  petAvatar: string | null = null;
  petSpecies = '';
  petSex = '';
  imageLoadFailed = false;

  documents: PetDocument[] = [];
  activeFilter: FilterTab = 'ALL';
  loading = true;

  tabs: { key: FilterTab; label: string }[] = [
  { key: 'ALL',              label: 'Todos' },
  { key: 'VACCINE',          label: 'Vacunas' },
  { key: 'LAB_RESULT',       label: 'Lab' },
  { key: 'MEDICAL_RECORD',   label: 'Historial' },
  { key: 'SURGERY_REPORT',   label: 'Cirugía' },
  { key: 'PRESCRIPTION',     label: 'Receta' },
  { key: 'DEWORMING',        label: 'Desparasitación' },
  { key: 'ALLERGY_REPORT',   label: 'Alergias' },
  { key: 'OTHER',            label: 'Otro' },
];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService,
    private petService: PetService
  ) {}

  ngOnInit() {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
    if (!this.petId) return;
    this.loadPetInfo();
    this.loadDocuments();
  }

  ionViewWillEnter() {
    if (this.petId) this.loadDocuments();
  }

  private loadPetInfo() {
    this.petService.getPetById(this.petId).subscribe({
      next: (pet) => {
        this.petName = pet.name;
        this.petAvatar = pet.imageUrl;
        this.petSpecies = pet.species;
        this.petSex = pet.sex || '';
      },
      error: (err) => console.error('❌ Error cargando mascota:', err)
    });
  }

  private loadDocuments() {
    this.loading = true;
    this.documentService.getDocumentsByPet(this.petId).subscribe({
      next: (docs) => {
        this.documents = docs;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando documentos:', err);
        this.documents = [];
        this.loading = false;
      }
    });
  }

  setFilter(tab: FilterTab) {
    this.activeFilter = tab;
  }

  get filteredDocuments(): PetDocument[] {
  if (this.activeFilter === 'ALL') return this.documents;
  return this.documents.filter(d => d.documentType === this.activeFilter);
}

  onImageError() {
    this.imageLoadFailed = true;
  }

  getPetIconFallback(species: string | undefined): string {
    const speciesMap: { [key: string]: string } = {
      'perro': '🐶', 'gato': '🐱', 'conejo': '🐰', 'tortuga': '🐢',
      'pájaro': '🦜', 'pajaro': '🦜', 'loro': '🦜', 'canario': '🐦',
      'hámster': '🐹', 'hamster': '🐹', 'pez': '🐠', 'iguana': '🦎',
      'hurón': '🦡', 'huron': '🦡', 'cobaya': '🐹', 'chinchilla': '🐭',
      'serpiente': '🐍',
    };
    const key = (species || '').toLowerCase().trim();
    return speciesMap[key] || '🐾';
  }

  getSexColor(sex: string | undefined): string {
    const s = (sex || '').toLowerCase().trim();
    if (s === 'macho' || s === 'male') return '#4A90E2';
    if (s === 'hembra' || s === 'female') return '#FF8FB1';
    return '#CCCCCC';
  }

  typeLabel(type: DocumentType): string {
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
  return map[type];
}

  isPdf(doc: PetDocument): boolean {
  return doc.mimeType === 'application/pdf';
}


  formatSize(bytes: number): string {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

  onViewDoc(doc: PetDocument) {
    this.router.navigate(['/pets', this.petId, 'documents', doc.id]);
  }

  onDownload(doc: PetDocument, event: Event) {
    event.stopPropagation();
    this.documentService.getDownloadUrl(this.petId, doc.id).subscribe({
      next: (res) => window.open(res.downloadUrl, '_blank'),
      error: (err) => {
        console.error('❌ Error obteniendo URL de descarga:', err);
        alert('No se pudo descargar el documento.');
      }
    });
  }

  onUpload() {
    this.router.navigate(['/pets', this.petId, 'documents', 'upload']);
  }

  goBack() {
    history.back();
  }
}