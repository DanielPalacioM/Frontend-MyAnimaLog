import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PetService } from 'src/app/services/PetService/pet';
import { PetHealthService } from 'src/app/services/PetHealthService/pet-health';
import { AllergySeverity } from 'src/app/models/pet-health.model';

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

@Component({
  selector: 'app-add-pet',
  templateUrl: './add-pet.component.html',
  styleUrls: ['./add-pet.component.scss'],
  standalone: false
})
export class AddPetComponent implements OnInit {

  currentStep = 1;
  totalSteps = 3;
  isEditMode = false;
  petId: string | null = null;
  isSaving = false;
  photoWasRemoved = false;


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
          species: pet.species,
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
      },
      error: (err) => {
        console.error('❌ Error cargando mascota:', err);
        alert('No se pudo cargar la información de la mascota.');
      }
    });
  }

  goNext() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  goBack() {
  if (this.currentStep > 1) {
    this.currentStep--;
  } else if (window.history.length > 1) {
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
      case 1: return true;
      case 2: return !!this.petForm.name && !!this.petForm.species && !!this.petForm.sex;
      case 3: return true;
      default: return false;
    }
  }

  savePet() {
  if (this.isSaving) return;
  this.isSaving = true;

  if (this.isEditMode && this.petId) {
    this.petService.updatePet(this.petId, this.petForm).subscribe({
      next: (pet) => {
        console.log('✅ Mascota actualizada exitosamente:', pet);

        if (this.photoWasRemoved) {
          this.petService.deletePhoto(this.petId!).subscribe({
            next: () => {
              this.isSaving = false;
              this.router.navigate(['/pet-profile', this.petId], { replaceUrl: true });
            },
            error: (err) => {
              console.error('❌ Error eliminando foto:', err);
              this.isSaving = false;
              this.router.navigate(['/pet-profile', this.petId], { replaceUrl: true }); // navega igual, la mascota sí se actualizó
            }
          });
        } else {
          this.isSaving = false;
          this.router.navigate(['/pet-profile', this.petId], { replaceUrl: true });
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
          this.router.navigate(['/home'], { replaceUrl: true });
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

  cancel() {
  this.location.back();
}
}