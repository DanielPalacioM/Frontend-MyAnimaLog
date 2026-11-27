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
  /** Qué parte se muestra: 'who' (paso 1: nombre, especie, sexo), 'how' (paso 2: raza, edad, medidas) o 'all' (edición, en tarjetas). */
  @Input() section: 'who' | 'how' | 'all' = 'all';

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
  sex: 'MALE' | 'FEMALE' | '' = '';
  weightKg: number | null = null;
  heightCm: number | null = null;
  nameFocus = false;
  /** Sin fecha exacta: el dueño pone años y meses y se calcula una fecha aproximada. */
  approxAge = false;
  approxYears: number | null = null;
  approxMonths: number | null = null;
  readonly today = new Date().toISOString().slice(0, 10);

  get isOther(): boolean {
    return !!this.selectedSpecies && !SPECIES_LIST.some(s => s.key === this.selectedSpecies);
  }

  get otherLabel(): string {
    const s = this.customSpecies || this.selectedSpecies;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  get speciesEmoji(): string {
    return SPECIES_LIST.find(s => s.key === this.selectedSpecies)?.emoji || '🐾';
  }

  /** "Perro · Macho" en el resumen del paso 2. */
  get summaryLine(): string {
    const sp = SPECIES_LIST.find(s => s.key === this.selectedSpecies)?.label || (this.selectedSpecies ? this.otherLabel : '');
    const sx = this.sex === 'MALE' ? 'Macho' : this.sex === 'FEMALE' ? 'Hembra' : '';
    return [sp, sx].filter(Boolean).join(' · ');
  }

  /** Atajos debajo de la raza: Mestizo y las dos más comunes de la especie. */
  get breedSuggestions(): string[] {
    return ['Mestizo', ...(BREEDS[this.selectedSpecies] || []).slice(0, 2)];
  }

  get ageLabel(): string {
    const m = this.ageMonths ?? 0;
    if (m < 12) return m === 1 ? '1 mes' : `${m} meses`;
    const y = Math.floor(m / 12), r = m % 12;
    return (y === 1 ? '1 año' : `${y} años`) + (r ? ` ${r} m` : '');
  }

  ngOnInit() {
    this.name           = this.data.name       || '';
    this.selectedSpecies = (this.data.species  || '').toLowerCase();
    this.breedSearch    = this.data.breed      || '';
    this.birthDate      = this.data.birthDate  || '';
    this.ageMonths      = this.data.ageMonths  || null;
    this.sex            = this.data.sex        || '';
    this.weightKg        = (this.data as any).weightKg ?? null;
    this.heightCm        = (this.data as any).heightCm ?? null;
  }

  selectSex(value: 'MALE' | 'FEMALE') {
    this.sex = value;
    this.emit();
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

  toggleApprox() {
    this.approxAge = !this.approxAge;
    if (this.approxAge && this.ageMonths !== null) {
      this.approxYears = Math.floor(this.ageMonths / 12);
      this.approxMonths = this.ageMonths % 12;
    }
  }

  /** Edad aproximada → fecha de nacimiento aproximada (hoy menos años y meses). */
  onApproxChange() {
    const y = Math.max(0, Math.floor(Number(this.approxYears) || 0));
    const m = Math.max(0, Math.floor(Number(this.approxMonths) || 0));
    if (!y && !m) {
      this.birthDate = '';
      this.ageMonths = null;
    } else {
      // Día 1 del mes (o 2 si hoy es 1): con la fecha de hoy el Home celebraba un "cumpleaños" falso el mismo día.
      const d = new Date();
      d.setDate(d.getDate() === 1 ? 2 : 1);
      d.setMonth(d.getMonth() - (y * 12 + m));
      this.birthDate = d.toISOString().slice(0, 10);
      this.ageMonths = y * 12 + m;
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
      sex:       this.sex,
      weightKg:   this.weightKg,
      heightCm:   this.heightCm,
    } as Partial<PetForm>);
  }
}