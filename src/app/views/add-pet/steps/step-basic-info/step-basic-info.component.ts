import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { PetForm } from '../../add-pet.component';

export const SPECIES_LIST = [
  { key: 'perro',  label: 'Perro',  emoji: '🐶' },
  { key: 'gato',   label: 'Gato',   emoji: '🐱' },
  { key: 'conejo', label: 'Conejo', emoji: '🐰' },
];

export const BREEDS: Record<string, string[]> = {
  perro: ['Pastor Alemán','Labrador','Golden Retriever','Bulldog','Poodle','Chihuahua','Beagle','Husky','Dálmata','Boxer'],
  gato:  ['Siamés','Persa','Maine Coon','Bengalí','Ragdoll','Sphynx','Scottish Fold','Angora','Abisinio','Birmano'],
  conejo:['Holandés','Rex','Angora','Lionhead','Mini Lop','Belier','Californiano','Nueva Zelanda'],
};

export const OTHER_SPECIES = [
  'Tortuga','Pájaro','Hámster','Pez','Iguana','Hurón',
  'Cobaya','Chinchilla','Serpiente','Loro','Canario'
];

@Component({
  selector: 'app-step-basic-info',
  templateUrl: './step-basic-info.component.html',
  styleUrls: ['./step-basic-info.component.scss'],
  standalone: false
})
export class StepBasicInfoComponent implements OnInit {
  @Input() data!: PetForm;
  @Output() dataChange = new EventEmitter<Partial<PetForm>>();
  @Input() editMode = false;

  speciesList = SPECIES_LIST;
  otherSpecies = OTHER_SPECIES;

  name = '';
  selectedSpecies = '';
  customSpecies = '';
  breedSearch = '';
  filteredBreeds: string[] = [];
  showBreedDropdown = false;
  showOtherModal = false;
  birthDate = '';
  ageMonths: number | null = null;

  ngOnInit() {
    this.name          = this.data.name       || '';
    this.selectedSpecies = this.data.species  || '';
    this.breedSearch   = this.data.breed      || '';
    this.birthDate     = this.data.birthDate  || '';
    this.ageMonths     = this.data.ageMonths  || null;
  }

  selectSpecies(key: string) {
    this.selectedSpecies = key;
    this.breedSearch = '';
    this.filteredBreeds = [];
    this.showOtherModal = false;
    this.emit();
  }

  openOtherModal() {
    this.showOtherModal = true;
  }

  selectOtherSpecies(sp: string) {
    this.selectedSpecies = sp.toLowerCase();
    this.customSpecies = sp;
    this.showOtherModal = false;
    this.breedSearch = '';
    this.filteredBreeds = [];
    this.emit();
  }

  closeOtherModal() {
    this.showOtherModal = false;
  }

  onBreedInput() {
    const breeds = BREEDS[this.selectedSpecies] || [];
    const q = this.breedSearch.toLowerCase();
    this.filteredBreeds = q
      ? breeds.filter(b => b.toLowerCase().includes(q))
      : [];
    this.showBreedDropdown = this.filteredBreeds.length > 0;
    this.emit();
  }

  selectBreed(breed: string) {
    this.breedSearch = breed;
    this.showBreedDropdown = false;
    this.emit();
  }

  onBirthDateChange() {
    if (this.birthDate) {
      const birth = new Date(this.birthDate);
      const now   = new Date();
      const diff  = (now.getFullYear() - birth.getFullYear()) * 12
                  + (now.getMonth()    - birth.getMonth());
      this.ageMonths = Math.max(0, diff);
    }
    this.emit();
  }

  emit() {
    this.dataChange.emit({
      name:      this.name,
      species:   this.selectedSpecies,
      breed:     this.breedSearch,
      birthDate: this.birthDate,
      ageMonths: this.ageMonths,
    });
  }
}