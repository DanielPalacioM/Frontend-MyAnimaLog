import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Pet } from 'src/app/services/PetService/pet';
import { PetHealthService } from 'src/app/services/PetHealthService/pet-health';
import { DewormingKind, HealthError, NewDeworming } from 'src/app/models/pet-health.model';
import {
  DEWORMING_KINDS,
  DEWORMING_SCHEDULE_NOTE,
  dewormingKindHint,
  dewormingKindLabel,
  healthErrorText,
  isoDate,
  suggestNextDose,
  todayIso,
} from 'src/app/shared/utils/pet-health.util';

/**
 * Registrar desparasitación (`/pet-health/:petId/deworming/new?kind=`), parecida a "Registrar vacuna":
 * tipo, producto, dosis, peso (se rellena con el de la mascota), fecha y próxima dosis (propuesta según la edad, editable).
 */
@Component({
  selector: 'app-register-deworming',
  templateUrl: './register-deworming.page.html',
  styleUrls: ['./register-deworming.page.scss'],
  standalone: false
})
export class RegisterDewormingPage {
  readonly kinds = DEWORMING_KINDS;
  readonly scheduleNote = DEWORMING_SCHEDULE_NOTE;
  readonly today = todayIso();

  petId = '';
  pet: Pet | null = null;
  canEdit = true;
  loading = true;
  loadError = false;

  kind: DewormingKind = 'INTERNAL';
  product = '';
  dose = '';
  weight = '';
  appliedDate = todayIso();
  nextDose = '';
  /** El usuario cambió la próxima dosis a mano: ya no se recalcula sola. */
  nextEdited = false;
  notes = '';

  saving = false;
  error = '';
  submitted = false;

  constructor(private route: ActivatedRoute, private router: Router, private health: PetHealthService) {}

  ngOnInit(): void {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
    const q = (this.route.snapshot.queryParamMap.get('kind') || '').toUpperCase();
    if (q === 'INTERNAL' || q === 'EXTERNAL') this.kind = q;
    if (!this.petId) { this.loadError = true; this.loading = false; return; }
    this.health.loadAccess(this.petId).subscribe({
      next: ({ pet, canEdit }) => {
        this.pet = pet;
        this.canEdit = canEdit;
        this.loading = false;
        if (pet.weight != null) this.weight = String(pet.weight);
        this.recalcNext();
      },
      error: (err) => {
        console.error('❌ Error cargando mascota:', err);
        this.loadError = true;
        this.loading = false;
      }
    });
  }

  kindLabel(k: DewormingKind): string { return dewormingKindLabel(k); }
  kindHint(k: DewormingKind): string { return dewormingKindHint(k); }

  pickKind(k: DewormingKind): void {
    this.kind = k;
    this.recalcNext();
  }

  onDateChange(v: string): void {
    this.appliedDate = v;
    this.recalcNext();
  }

  onNextChange(v: string): void {
    this.nextDose = v;
    this.nextEdited = true;
  }

  /** Propone la próxima dosis según el tipo y la edad (mientras el usuario no la haya cambiado). */
  private recalcNext(): void {
    if (this.nextEdited) return;
    this.nextDose = suggestNextDose(this.kind, this.pet?.birthDate || '', this.appliedDate);
  }

  clearNext(): void {
    this.nextDose = '';
    this.nextEdited = true;
  }

  get productInvalid(): boolean { return this.submitted && !this.product.trim(); }

  private validate(): string {
    if (!this.product.trim()) return 'Escribe el nombre del producto.';
    const applied = isoDate(this.appliedDate);
    if (!applied) return 'Elige la fecha en que se aplicó.';
    if (applied > this.today) return 'La fecha de aplicación no puede ser futura.';
    const born = isoDate(this.pet?.birthDate);
    if (born && applied < born) return 'La fecha no puede ser anterior al nacimiento.';
    if (this.weight.trim() && !(Number(this.weight.replace(',', '.')) > 0)) return 'El peso debe ser un número mayor que 0.';
    const next = isoDate(this.nextDose);
    if (next && next < applied) return 'La próxima dosis no puede ser anterior a la aplicación.';
    return '';
  }

  save(): void {
    if (this.saving) return;
    this.submitted = true;
    this.error = this.validate();
    if (this.error) return;

    const body: NewDeworming = {
      petId: this.petId,
      kind: this.kind,
      product: this.product.trim(),
      applicationDate: isoDate(this.appliedDate),
    };
    if (this.dose.trim()) body.dose = this.dose.trim();
    if (this.weight.trim()) body.weightKg = Number(this.weight.replace(',', '.'));
    if (isoDate(this.nextDose)) body.nextDoseDate = isoDate(this.nextDose);
    if (this.notes.trim()) body.notes = this.notes.trim();

    this.saving = true;
    this.health.addDeworming(body).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/pet-health', this.petId, 'deworming'], { replaceUrl: true });
      },
      error: (e: HealthError) => {
        this.saving = false;
        this.error = healthErrorText(e);
      }
    });
  }

  cancel(): void { history.back(); }
  goBack(): void { history.back(); }
}
