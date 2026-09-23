import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentService } from 'src/app/services/DocumentService/document-service/document-service'; 
import { PetService } from 'src/app/services/PetService/pet';
import { DocumentType } from 'src/app/models/pet-document.model';

@Component({
  selector: 'app-upload-document',
  templateUrl: './upload-document.page.html',
  styleUrls: ['./upload-document.page.scss'],
  standalone: false
})
export class UploadDocumentPage implements OnInit {

  petId = '';
  petName = '';
  petAvatar: string | null = null;
  petSpecies = '';
  petSex = '';
  imageLoadFailed = false;

  typeOptions: { key: DocumentType; label: string; icon: string }[] = [
  { key: 'VACCINE',         label: 'Vacunas',       icon: 'medkit-outline' },
  { key: 'LAB_RESULT',      label: 'Lab',           icon: 'pulse-outline' },
  { key: 'MEDICAL_RECORD',  label: 'Historial',     icon: 'document-text-outline' },
  { key: 'PRESCRIPTION',    label: 'Receta',        icon: 'reader-outline' },
  { key: 'SURGERY_REPORT',  label: 'Cirugía',       icon: 'cut-outline' },
  { key: 'DEWORMING',       label: 'Desparasitación', icon: 'bug-outline' },
  { key: 'ALLERGY_REPORT',  label: 'Alergias',      icon: 'alert-circle-outline' },
  { key: 'OTHER',           label: 'Otro',          icon: 'ellipsis-horizontal-outline' },
];

  selectedType: DocumentType | null = null;
  selectedFile: File | null = null;
  fileName = '';
  fileSizeLabel = '';
  previewUrl: string | null = null;

  title = '';
  description = '';
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService,
    private petService: PetService
  ) {}

  ngOnInit() {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
    if (!this.petId) return;
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

  onImageError() { this.imageLoadFailed = true; }

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

  selectType(type: DocumentType) {
    this.selectedType = type;
  }

  onFileSelected(event: Event, source: 'foto' | 'galeria' | 'pdf') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFile = file;
    this.fileName = file.name;
    const kb = Math.round(file.size / 1024);
    this.fileSizeLabel = kb < 1024 ? `${kb}KB` : `${(kb / 1024).toFixed(1)}MB`;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => this.previewUrl = reader.result as string;
      reader.readAsDataURL(file);
    } else {
      this.previewUrl = null; // PDF: se muestra ícono, no preview de imagen
    }
  }

  removeFile() {
    this.selectedFile = null;
    this.fileName = '';
    this.fileSizeLabel = '';
    this.previewUrl = null;
  }

  isPdfSelected(): boolean {
    return this.selectedFile?.type === 'application/pdf';
  }

  save() {
    if (this.saving) return;

    if (!this.selectedType) {
      alert('Selecciona el tipo de documento.');
      return;
    }
    if (!this.selectedFile) {
      alert('Selecciona un archivo para subir.');
      return;
    }
    if (!this.title.trim()) {
      alert('Ingresa un título para el documento.');
      return;
    }

    this.saving = true;

    this.documentService.uploadDocument(
      this.petId,
      this.selectedFile,
      this.selectedType,
      this.title.trim(),
      this.description.trim() || undefined
    ).subscribe({
      next: (doc) => {
        console.log('✅ Documento subido exitosamente:', doc);
        this.saving = false;
        this.router.navigate(['/pets', this.petId, 'documents'], { replaceUrl: true });
      },
      error: (err) => {
        this.saving = false;
        console.error('❌ Error subiendo documento:', err);
        alert('No se pudo subir el documento. Intenta de nuevo.');
      }
    });
  }

  cancel() {
    history.back();
  }

  goBack() {
    history.back();
  }
}