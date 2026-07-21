import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

export interface PetForm {
  // Fase 1 - Foto
  photo: string | null;

  // Fase 2 - Info básica
  name: string;
  species: string;
  breed: string;
  birthDate: string;
  ageMonths: number | null;

  // Fase 3 - Médico
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

  petForm: PetForm = {
    photo: null,
    name: '',
    species: '',
    breed: '',
    birthDate: '',
    ageMonths: null,
    vaccine: null,
    document: null,
    vetName: '',
  };

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.petId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = this.router.url.includes('/edit');

    if (this.isEditMode && this.petId) {
      this.loadPetData(this.petId);
    }
  }

  loadPetData(id: string) {
    // TODO: reemplazar por PetsService.getById(id)
    // MOCK temporal:
    this.petForm = {
      photo: 'assets/images/Profile/cat-juan.png',
      name: 'Milo',
      species: 'perro',
      breed: 'Pastor aleman',
      birthDate: '2025-12-19',
      ageMonths: 5,
      vaccine: null,
      document: null,
      vetName: '',
    };
  }

  goNext() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  goBack() {
    if (this.currentStep > 1) {
      this.currentStep--;
    } else {
      this.router.navigate(this.isEditMode ? ['/pets', this.petId] : ['/home']);
    }
  }

  onStepDataChange(data: Partial<PetForm>) {
    this.petForm = { ...this.petForm, ...data };
  }

  canProceed(): boolean {
    switch (this.currentStep) {
      case 1: return !!this.petForm.photo;
      case 2: return !!this.petForm.name && !!this.petForm.species;
      case 3: return true;
      default: return false;
    }
  }

  savePet() {
    if (this.isEditMode) {
      console.log('Actualizar mascota:', this.petId, this.petForm);
      // TODO: PetsService.update(this.petId, this.petForm)
      this.router.navigate(['/pets', this.petId]);
    } else {
      console.log('Crear mascota:', this.petForm);
      // TODO: PetsService.create(this.petForm)
      this.router.navigate(['/home']);
    }
  }

  cancel() {
    this.router.navigate(this.isEditMode ? ['/pets', this.petId] : ['/home']);
  }
}