import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PetService } from 'src/app/services/PetService/pet';
import { PetHealthService } from 'src/app/services/PetHealthService/pet-health';
import { AllergySeverity } from 'src/app/models/pet-health.model';
import { SPECIES_LIST } from './steps/step-basic-info/step-basic-info.component';

export interface PetForm {
  photo: string | null;
  name: string;
  species: string;
  breed: string;
  sex: 'MALE' | 'FEMALE' | '';
  weightKg: number | null;
  heightCm: number | null;
  birthDate: string;
  ageMonths: number | null;
  vaccine: { type: string; date: string } | null;
  document: File | null;
  vetName: string;
  // Salud: se guarda en Medical justo después de crear la mascota. "No sé" no es "no": UNKNOWN es el valor por defecto.
  neuteredStatus: 'YES' | 'NO' | 'UNKNOWN';
  neuteredAt: string;
  allergyAnswer: 'YES' | 'NO' | 'UNKNOWN';
  allergies: { allergen: string; severity: AllergySeverity }[];
}

/** Lo que muestra la pantalla de bienvenida al terminar el registro. */
export interface SavedPet { id: string; name: string; }

const CONFETTI_COLORS = ['#4037BE', '#f5a623', '#00796B', '#FF7AA8', '#FFC970', '#7C74E8'];

/**
 * Agregar mascota (3 pasos: Quién es, Cómo es, Salud) y Editar perfil (una sola pantalla en tarjetas).
 * Figma: "Agregar mascota · Paso 1/2/3 (propuesta)", "¡Listo!", "Mascota · Editar perfil" y "Salir sin guardar".
 * Al terminar el registro se queda en la bienvenida: el perrito salta y le da la bienvenida con confeti.
 */
@Component({
  selector: 'app-add-pet',
  templateUrl: './add-pet.component.html',
  styleUrls: ['./add-pet.component.scss'],
  standalone: false
})
export class AddPetComponent implements OnInit {

  currentStep = 1;
  totalSteps = 3;
  readonly stepLabels = ['Quién es', 'Cómo es', 'Salud'];
  isEditMode = false;
  petId: string | null = null;
  isSaving = false;
  photoWasRemoved = false;
  /** En edición los pasos se pintan cuando llegan los datos (leen `data` al iniciar). */
  loaded = false;
  /** Hoja "¿Salir sin guardar?" (reemplaza el botón Cancelar). */
  showExit = false;
  /** Mascota recién creada: muestra la bienvenida. */
  saved: SavedPet | null = null;
  readonly confetti = CONFETTI_COLORS.concat(CONFETTI_COLORS, CONFETTI_COLORS).map((color, i) => ({
    left: `${(i * 37 + 7) % 100}%`,
    background: color,
    'animation-delay': `${(i % 6) * 0.12 + (i > 9 ? 0.35 : 0)}s`,
    'animation-duration': `${2.4 + (i % 5) * 0.35}s`,
    width: i % 3 === 0 ? '6px' : '8px',
    height: i % 3 === 0 ? '12px' : '8px',
    'border-radius': i % 4 === 0 ? '50%' : '2px',
  }));

  private initialSnapshot = '';

  petForm: PetForm = {
    photo: null,
    name: '',
    species: '',
    breed: '',
    sex: '',
    weightKg: null,
    heightCm: null,
    birthDate: '',
    ageMonths: null,
    vaccine: null,
    document: null,
    vetName: '',
    neuteredStatus: 'UNKNOWN',
    neuteredAt: '',
    allergyAnswer: 'UNKNOWN',
    allergies: [],
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private petService: PetService,
    private location: Location,
    private petHealth: PetHealthService,
  ) {}

  ngOnInit() {
    this.petId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = this.router.url.includes('/edit');

    if (this.isEditMode && this.petId) {
      this.loadPetData(this.petId);
    } else {
      this.loaded = true;
      this.initialSnapshot = this.snapshot();
    }
  }

  onPhotoRemoved() {
    this.photoWasRemoved = true;
  }

  loadPetData(id: string) {
    this.petService.getPetById(id).subscribe({
      next: (pet) => {
        this.petForm = {
          photo: pet.imageUrl,
          name: pet.name,
          species: (pet.species || '').toLowerCase(),
          breed: pet.breed,
          sex: (pet.sex as 'MALE' | 'FEMALE') || '',
          weightKg: pet.weight ?? null,
          heightCm: pet.height ?? null,
          birthDate: pet.birthDate,
          ageMonths: pet.ageMonths,
          vaccine: pet.vaccine ? { type: pet.vaccine.type, date: pet.vaccine.date } : null,
          document: null,
          vetName: pet.vetName,
          neuteredStatus: 'UNKNOWN',
          neuteredAt: '',
          allergyAnswer: 'UNKNOWN',
          allergies: [],
        };
        this.initialSnapshot = this.snapshot();
        this.loaded = true;
      },
      error: (err) => {
        console.error('❌ Error cargando mascota:', err);
        alert('No se pudo cargar la información de la mascota.');
      }
    });
  }

  /** Lo que el dueño puede cambiar, para saber si hay cambios sin guardar. */
  private snapshot(): string {
    const f = this.petForm;
    return JSON.stringify([f.photo, f.name, f.species, f.breed, f.sex, f.weightKg, f.heightCm, f.birthDate,
      f.neuteredStatus, f.neuteredAt, f.allergyAnswer, f.allergies]);
  }

  get hasChanges(): boolean {
    return this.photoWasRemoved || this.snapshot() !== this.initialSnapshot;
  }

  /** Lo mínimo para crear o actualizar: nombre, especie y sexo. */
  get canSave(): boolean {
    return !!this.petForm.name?.trim() && !!this.petForm.species && !!this.petForm.sex;
  }

  get missingText(): string {
    const f = this.petForm;
    const miss = [!f.name?.trim() && 'el nombre', !f.species && 'la especie', !f.sex && 'el sexo'].filter(Boolean) as string[];
    return miss.length > 1 ? miss.slice(0, -1).join(', ') + ' y ' + miss[miss.length - 1] : (miss[0] || '');
  }

  goNext() {
    if (this.currentStep < this.totalSteps && this.canProceed()) {
      this.currentStep++;
    }
  }

  /** Atrás: paso anterior; en el primero (o en edición) pregunta antes de perder lo llenado. */
  goBack() {
    if (!this.isEditMode && this.currentStep > 1) {
      this.currentStep--;
      return;
    }
    if (this.hasChanges) {
      this.showExit = true;
      return;
    }
    this.leave();
  }

  leave() {
    this.showExit = false;
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/home']);
    }
  }

  onStepDataChange(data: Partial<PetForm>) {
    this.petForm = { ...this.petForm, ...data };
  }

  canProceed(): boolean {
    switch (this.currentStep) {
      case 1: return this.canSave;
      case 2: return true;
      case 3: return true;
      default: return false;
    }
  }

  savePet() {
    if (this.isSaving || !this.canSave) return;
    this.isSaving = true;

    if (this.isEditMode && this.petId) {
      this.petService.updatePet(this.petId, this.petForm).subscribe({
        next: (pet) => {
          console.log('✅ Mascota actualizada exitosamente:', pet);

          if (this.photoWasRemoved) {
            this.petService.deletePhoto(this.petId!).subscribe({
              next: () => this.afterUpdate(),
              error: (err) => {
                console.error('❌ Error eliminando foto:', err);
                this.afterUpdate(); // navega igual, la mascota sí se actualizó
              }
            });
          } else {
            this.afterUpdate();
          }
        },
        error: (err) => {
          this.isSaving = false;
          console.error('❌ Error actualizando mascota:', err);
          alert('No se pudo actualizar la mascota. Intenta de nuevo.');
        }
      });
    } else {
      this.petService.addPet(this.petForm).subscribe({
        next: (pet) => {
          console.log('✅ Mascota creada exitosamente:', pet);
          // La mascota ya existe: si algo de salud falla no se pierde, se puede completar después desde su perfil.
          this.saveHealth(pet.id).subscribe(() => {
            this.isSaving = false;
            this.saved = { id: pet.id, name: pet.name || this.petForm.name.trim() };
          });
        },
        error: (err) => {
          this.isSaving = false;
          console.error('❌ Error creando mascota:', err);
          alert('No se pudo guardar la mascota. Intenta de nuevo.');
        }
      });
    }
  }

  private afterUpdate() {
    this.isSaving = false;
    this.router.navigate(['/pet-profile', this.petId], { replaceUrl: true });
  }

  /** Esterilización y alergias que el dueño contestó en el registro (solo lo que contestó; "No sé" no se manda). */
  saveHealth(petId: string): Observable<unknown> {
    const f = this.petForm;
    const calls: Observable<unknown>[] = [];
    if (f.neuteredStatus !== 'UNKNOWN') {
      calls.push(this.petHealth.setNeutered(petId, f.neuteredStatus, f.neuteredAt || undefined));
    }
    if (f.allergyAnswer === 'NO') {
      calls.push(this.petHealth.setAllergyStatus(petId, 'NONE_KNOWN'));
    } else if (f.allergyAnswer === 'YES') {
      f.allergies
        .filter(a => a.allergen.trim())
        .forEach(a => calls.push(this.petHealth.addAllergy({ petId, allergen: a.allergen.trim(), category: 'OTHER', severity: a.severity })));
    }
    if (!calls.length) return of(null);
    return forkJoin(calls.map(c => c.pipe(catchError(err => { console.error('❌ No se pudo guardar un dato de salud:', err); return of(null); }))));
  }

  // ---------- Bienvenida ----------

  get speciesEmoji(): string {
    return SPECIES_LIST.find(s => s.key === this.petForm.species)?.emoji || '🐾';
  }

  /** "Perro · Pastor Alemán · 11 meses" */
  get petLine(): string {
    const f = this.petForm;
    const sp = SPECIES_LIST.find(s => s.key === f.species)?.label || (f.species ? f.species.charAt(0).toUpperCase() + f.species.slice(1) : '');
    let age = '';
    if (f.ageMonths !== null && f.ageMonths !== undefined) {
      const m = f.ageMonths;
      age = m < 12 ? (m === 1 ? '1 mes' : `${m} meses`) : (Math.floor(m / 12) === 1 ? '1 año' : `${Math.floor(m / 12)} años`);
    }
    return [sp, f.breed?.trim(), age].filter(Boolean).join(' · ');
  }

  get healthChips(): { label: string; kind: string }[] {
    const f = this.petForm;
    const chips: { label: string; kind: string }[] = [];
    if (f.neuteredStatus === 'YES') chips.push({ label: f.sex === 'FEMALE' ? '✓ Esterilizada' : '✓ Esterilizado', kind: 'ok' });
    if (f.allergyAnswer === 'NO') chips.push({ label: '✓ Sin alergias conocidas', kind: 'ok' });
    const names = f.allergyAnswer === 'YES' ? f.allergies.map(a => a.allergen.trim()).filter(Boolean) : [];
    if (names.length) chips.push({ label: `⚠ Alergia: ${names.join(', ')}`, kind: 'warn' });
    return chips;
  }

  goVaccines() {
    this.router.navigate(['/register-vaccine'], { queryParams: { petId: this.saved?.id }, replaceUrl: true });
  }

  goDocuments() {
    this.router.navigate(['/pets', this.saved?.id, 'documents', 'upload'], { replaceUrl: true });
  }

  goVet() {
    this.router.navigate(['/vet'], { replaceUrl: true });
  }

  goProfile() {
    this.router.navigate(['/pet-profile', this.saved?.id], { replaceUrl: true });
  }

  goHome() {
    this.router.navigate(['/home'], { replaceUrl: true });
  }

  goHealth() {
    this.router.navigate(['/pet-health', this.petId]);
  }
}
