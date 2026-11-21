import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Pet } from 'src/app/services/PetService/pet';
import { PetHealthService } from 'src/app/services/PetHealthService/pet-health';
import {
  Allergy,
  AllergyCategory,
  AllergyOverview,
  AllergySeverity,
  HealthError,
  Neutered,
  NeuteredStatus,
} from 'src/app/models/pet-health.model';
import {
  ALLERGY_CATEGORIES,
  ALLERGY_SEVERITIES,
  allergyCategoryLabel,
  allergyOrigin,
  allergySeverityLabel,
  allergyStatusLabel,
  healthDate,
  healthErrorText,
  isActiveAllergy,
  isoDate,
  neuteredLabel,
  neuteredOrigin,
  todayIso,
} from 'src/app/shared/utils/pet-health.util';

type ChangeState = 'RESOLVED' | 'ENTERED_IN_ERROR';

/**
 * "Salud y alertas" de una mascota (`/pet-health/:petId`): esterilización y alergias.
 * El dueño declara: una alergia queda "Declarada por ti" hasta que un veterinario la confirma.
 * `OWNER` y `EDITOR` registran; `VIEWER` solo lee.
 */
@Component({
  selector: 'app-health',
  templateUrl: './health.page.html',
  styleUrls: ['./health.page.scss'],
  standalone: false
})
export class HealthPage {
  readonly today = todayIso();
  readonly categories = ALLERGY_CATEGORIES;
  readonly severities = ALLERGY_SEVERITIES;
  readonly neuteredOptions: { value: NeuteredStatus; label: string }[] = [
    { value: 'YES', label: 'Sí' },
    { value: 'NO', label: 'No' },
    { value: 'UNKNOWN', label: 'No sé' },
  ];

  petId = '';
  pet: Pet | null = null;
  canEdit = false;
  loading = true;
  loadError = false;

  neutered: Neutered | null = null;
  neuteredFailed: HealthError | null = null;
  allergies: AllergyOverview | null = null;
  allergiesFailed: HealthError | null = null;

  notice = '';
  statusError = '';
  statusBusy = false;

  // Esterilización (hoja inferior)
  neuteredOpen = false;
  nStatus: NeuteredStatus = 'UNKNOWN';
  nDate = '';
  nError = '';
  nSaving = false;

  // Agregar alergia (hoja inferior)
  addOpen = false;
  form: { allergen: string; category: AllergyCategory; severity: AllergySeverity; reaction: string } = this.emptyForm();
  formError = '';
  saving = false;

  // Cambiar el estado de una alergia (hoja inferior)
  changing: { allergy: Allergy; state: ChangeState } | null = null;
  reason = '';
  changeError = '';
  changeBusy = false;

  constructor(private route: ActivatedRoute, private health: PetHealthService) {}

  ngOnInit(): void {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
    this.load();
  }

  ionViewWillEnter(): void {
    if (this.pet) this.loadHealth();
  }

  // ---------------------------------------------------------------- Carga

  load(): void {
    if (!this.petId) { this.loadError = true; this.loading = false; return; }
    this.loading = true;
    this.loadError = false;
    this.health.loadAccess(this.petId).subscribe({
      next: ({ pet, canEdit }) => {
        this.pet = pet;
        this.canEdit = canEdit;
        this.loading = false;
        this.loadHealth();
      },
      error: (err) => {
        console.error('❌ Error cargando mascota:', err);
        this.loadError = true;
        this.loading = false;
      }
    });
  }

  loadHealth(): void {
    this.health.getSummary(this.petId).subscribe({
      next: (s) => { this.neutered = s.neutered; this.neuteredFailed = null; },
      error: (e: HealthError) => { console.error('❌ Esterilización:', e); this.neuteredFailed = e; }
    });
    this.health.getAllergies(this.petId).subscribe({
      next: (o) => { this.allergies = o; this.allergiesFailed = null; },
      error: (e: HealthError) => { console.error('❌ Alergias:', e); this.allergiesFailed = e; }
    });
  }

  // ---------------------------------------------------------------- Lectura

  get active(): Allergy[] { return (this.allergies?.allergies ?? []).filter(isActiveAllergy); }
  get past(): Allergy[] { return (this.allergies?.allergies ?? []).filter(a => a.state === 'RESOLVED'); }
  get hasSevere(): boolean { return this.active.some(a => a.severity === 'SEVERE'); }
  get unavailable(): boolean { return this.allergiesFailed?.code === 'NOT_AVAILABLE'; }
  get neuteredText(): string { return this.neutered ? neuteredLabel(this.neutered) : ''; }
  get neuteredWho(): string { return this.neutered ? neuteredOrigin(this.neutered) : ''; }
  get statusText(): string { return this.allergies ? allergyStatusLabel(this.allergies.allergyStatus) : ''; }
  get failedText(): string { return this.allergiesFailed ? healthErrorText(this.allergiesFailed) : ''; }

  sevLabel(s: AllergySeverity): string { return allergySeverityLabel(s); }
  catLabel(c: AllergyCategory): string { return allergyCategoryLabel(c); }
  origin(a: Allergy): string { return allergyOrigin(a); }
  date(iso: string): string { return healthDate(iso); }

  sevTone(s: AllergySeverity): 'bad' | 'warn' | 'mute' { return s === 'SEVERE' ? 'bad' : s === 'MODERATE' ? 'warn' : 'mute'; }

  /** Solo el dueño de la alergia (quien la declaró) puede retirarla; las de la clínica las cambia la clínica. */
  canChange(a: Allergy): boolean { return this.canEdit && !!a.id && a.source !== 'CLINIC'; }

  // ---------------------------------------------------------------- Estado general de alergias

  markNoneKnown(): void { this.setStatus('NONE_KNOWN'); }
  markUnknown(): void { this.setStatus('UNKNOWN'); }

  private setStatus(status: 'NONE_KNOWN' | 'UNKNOWN'): void {
    if (this.statusBusy) return;
    this.statusBusy = true;
    this.statusError = '';
    this.health.setAllergyStatus(this.petId, status).subscribe({
      next: () => {
        this.statusBusy = false;
        if (this.allergies) this.allergies = { ...this.allergies, allergyStatus: status };
      },
      error: (e: HealthError) => { this.statusBusy = false; this.statusError = healthErrorText(e); }
    });
  }

  // ---------------------------------------------------------------- Agregar alergia

  private emptyForm() {
    return { allergen: '', category: 'DRUG' as AllergyCategory, severity: 'MILD' as AllergySeverity, reaction: '' };
  }

  openAdd(): void {
    this.form = this.emptyForm();
    this.formError = '';
    this.addOpen = true;
  }

  closeAdd(): void { this.addOpen = false; }

  saveAllergy(): void {
    if (this.saving) return;
    const allergen = this.form.allergen.trim();
    if (!allergen) { this.formError = 'Escribe a qué es alérgica.'; return; }
    this.saving = true;
    this.formError = '';
    this.health.addAllergy({
      petId: this.petId,
      allergen,
      category: this.form.category,
      severity: this.form.severity,
      reaction: this.form.reaction.trim() || undefined,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.addOpen = false;
        this.notice = 'Alergia agregada. Un veterinario podrá confirmarla en su próxima consulta.';
        this.loadHealth();
      },
      error: (e: HealthError) => { this.saving = false; this.formError = healthErrorText(e); }
    });
  }

  // ---------------------------------------------------------------- Cambiar el estado de una alergia

  askChange(a: Allergy, state: ChangeState): void {
    this.changing = { allergy: a, state };
    this.reason = '';
    this.changeError = '';
  }

  closeChange(): void { this.changing = null; }

  get changeTitle(): string {
    if (!this.changing) return '';
    return this.changing.state === 'RESOLVED'
      ? `¿${this.pet?.name || 'Tu mascota'} ya no es alérgica a ${this.changing.allergy.allergen}?`
      : `¿Registraste ${this.changing.allergy.allergen} por error?`;
  }

  confirmChange(): void {
    if (!this.changing || this.changeBusy) return;
    const reason = this.reason.trim();
    if (!reason) { this.changeError = 'Escribe el motivo del cambio.'; return; }
    const { allergy, state } = this.changing;
    this.changeBusy = true;
    this.changeError = '';
    this.health.changeAllergyState(allergy.id, state, reason).subscribe({
      next: () => {
        this.changeBusy = false;
        this.changing = null;
        this.notice = state === 'RESOLVED' ? 'Listo: quedó como resuelta, sigue en el historial.' : 'Listo: quedó marcada como ingresada por error.';
        this.loadHealth();
      },
      error: (e: HealthError) => { this.changeBusy = false; this.changeError = healthErrorText(e); }
    });
  }

  // ---------------------------------------------------------------- Esterilización

  openNeutered(): void {
    this.nStatus = this.neutered?.status ?? 'UNKNOWN';
    this.nDate = this.neutered?.at ?? '';
    this.nError = '';
    this.neuteredOpen = true;
  }

  closeNeutered(): void { this.neuteredOpen = false; }

  pickNeutered(v: NeuteredStatus): void {
    this.nStatus = v;
    if (v !== 'YES') this.nDate = '';
  }

  saveNeutered(): void {
    if (this.nSaving) return;
    const at = isoDate(this.nDate);
    if (this.nStatus === 'YES' && at) {
      if (at > this.today) { this.nError = 'La fecha no puede ser futura.'; return; }
      const born = isoDate(this.pet?.birthDate);
      if (born && at < born) { this.nError = 'La fecha no puede ser anterior al nacimiento.'; return; }
    }
    this.nSaving = true;
    this.nError = '';
    this.health.setNeutered(this.petId, this.nStatus, at || undefined).subscribe({
      next: (n) => {
        this.nSaving = false;
        this.neuteredOpen = false;
        this.neutered = n.status === this.nStatus ? n : { ...n, status: this.nStatus, at };
        this.notice = 'Listo: se guardó. Tu veterinario podrá confirmarlo.';
      },
      error: (e: HealthError) => { this.nSaving = false; this.nError = healthErrorText(e); }
    });
  }

  goBack(): void { history.back(); }
}
