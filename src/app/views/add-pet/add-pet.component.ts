import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { PetService } from 'src/app/services/PetService/pet';

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
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private petService: PetService,
    private location: Location,
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
              this.router.navigate(['/pet-profile', this.petId]);
            },
            error: (err) => {
              console.error('❌ Error eliminando foto:', err);
              this.isSaving = false;
              this.router.navigate(['/pet-profile', this.petId]); // navega igual, la mascota sí se actualizó
            }
          });
        } else {
          this.isSaving = false;
          this.router.navigate(['/pet-profile', this.petId]);
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
        this.isSaving = false;
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isSaving = false;
        console.error('❌ Error creando mascota:', err);
        alert('No se pudo guardar la mascota. Intenta de nuevo.');
      }
    });
  }
}

  cancel() {
  this.location.back();
}
}