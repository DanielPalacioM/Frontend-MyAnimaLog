import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Pet } from 'src/app/services/PetService/pet';
import { PetHealthService } from 'src/app/services/PetHealthService/pet-health';
import {
  DewormingEntry,
  DewormingKind,
  DewormingKindStatus,
  DewormingOverview,
  HealthError,
  PreventionState,
} from 'src/app/models/pet-health.model';
import {
  DEWORMING_KINDS,
  DEWORMING_SCHEDULE_NOTE,
  dewormingKindHint,
  dewormingKindLabel,
  dueText,
  healthDate,
  healthErrorText,
  preventionLabel,
  withSuggestedNext,
} from 'src/app/shared/utils/pet-health.util';

/**
 * Desparasitación de una mascota (`/pet-health/:petId/deworming`): una sección propia, parecida a la línea de vida de vacunas.
 * Interna (lombrices) y externa (pulgas y garrapatas) van por separado, cada una con su estado y su próxima dosis.
 * `OWNER` y `EDITOR` registran; `VIEWER` solo lee.
 */
@Component({
  selector: 'app-deworming',
  templateUrl: './deworming.page.html',
  styleUrls: ['./deworming.page.scss'],
  standalone: false
})
export class DewormingPage {
  readonly kinds = DEWORMING_KINDS;
  readonly scheduleNote = DEWORMING_SCHEDULE_NOTE;

  petId = '';
  pet: Pet | null = null;
  canEdit = false;
  loading = true;
  loadError = false;

  overview: DewormingOverview | null = null;
  failed: HealthError | null = null;
  notice = '';

  // Anular una dosis registrada por error (hoja inferior)
  voiding: DewormingEntry | null = null;
  reason = '';
  voidError = '';
  voidBusy = false;

  constructor(private route: ActivatedRoute, private router: Router, private health: PetHealthService) {}

  ngOnInit(): void {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
    this.load();
  }

  ionViewWillEnter(): void {
    if (this.pet) this.loadOverview();
  }

  load(): void {
    if (!this.petId) { this.loadError = true; this.loading = false; return; }
    this.loading = true;
    this.loadError = false;
    this.health.loadAccess(this.petId).subscribe({
      next: ({ pet, canEdit }) => {
        this.pet = pet;
        this.canEdit = canEdit;
        this.loading = false;
        this.loadOverview();
      },
      error: (err) => {
        console.error('❌ Error cargando mascota:', err);
        this.loadError = true;
        this.loading = false;
      }
    });
  }

  loadOverview(): void {
    this.health.getDewormings(this.petId).subscribe({
      next: (o) => {
        const born = this.pet?.birthDate || '';
        // Si el backend no manda la próxima dosis, se propone según la edad (y queda marcada como sugerida).
        this.overview = { ...o, INTERNAL: withSuggestedNext(o.INTERNAL, born), EXTERNAL: withSuggestedNext(o.EXTERNAL, born) };
        this.failed = null;
      },
      error: (e: HealthError) => { console.error('❌ Desparasitación:', e); this.failed = e; }
    });
  }

  // ---------------------------------------------------------------- Lectura

  get unavailable(): boolean { return this.failed?.code === 'NOT_AVAILABLE'; }
  get failedText(): string { return this.failed ? healthErrorText(this.failed) : ''; }
  get anyRegistered(): boolean { return !!this.overview && (this.overview.INTERNAL.registered || this.overview.EXTERNAL.registered); }

  /** Dosis registradas, la más reciente primero. Si el backend solo manda la última de cada tipo, se muestran esas. */
  get entries(): DewormingEntry[] {
    if (!this.overview) return [];
    const fromHistory = this.overview.history.filter(h => !h.voided);
    if (fromHistory.length) return fromHistory;
    return [this.overview.INTERNAL.last, this.overview.EXTERNAL.last]
      .filter((e): e is DewormingEntry => !!e && !e.voided)
      .sort((a, b) => b.applicationDate.localeCompare(a.applicationDate));
  }

  status(k: DewormingKind): DewormingKindStatus | null { return this.overview ? this.overview[k] : null; }
  kindLabel(k: DewormingKind): string { return dewormingKindLabel(k); }
  kindHint(k: DewormingKind): string { return dewormingKindHint(k); }
  stateLabel(s: PreventionState): string { return preventionLabel(s); }
  date(iso: string): string { return healthDate(iso); }
  due(iso: string): string { return dueText(iso); }

  tone(s: PreventionState): 'ok' | 'warn' | 'bad' | 'mute' {
    return s === 'OK' ? 'ok' : s === 'DUE_SOON' ? 'warn' : s === 'OVERDUE' ? 'bad' : 'mute';
  }

  icon(s: PreventionState): string {
    return s === 'OK' ? 'checkmark-circle' : s === 'DUE_SOON' ? 'time' : s === 'OVERDUE' ? 'alert-circle' : 'remove-circle';
  }

  detail(e: DewormingEntry | null): string {
    if (!e) return '';
    return [e.product, e.dose, e.weightKg != null ? `${e.weightKg} kg` : ''].filter(Boolean).join(' · ');
  }

  who(e: DewormingEntry): string {
    return e.administeredBy === 'CLINIC' ? `Aplicada por ${e.veterinaryName || 'una clínica'}` : 'Registrada por ti';
  }

  /** Las dosis que aplicó una clínica las anula la clínica. */
  canVoid(e: DewormingEntry): boolean { return this.canEdit && !!e.id && e.administeredBy !== 'CLINIC'; }

  // ---------------------------------------------------------------- Acciones

  register(kind?: DewormingKind): void {
    this.router.navigate(['/pet-health', this.petId, 'deworming', 'new'], kind ? { queryParams: { kind } } : {});
  }

  askVoid(e: DewormingEntry): void {
    this.voiding = e;
    this.reason = '';
    this.voidError = '';
  }

  closeVoid(): void { this.voiding = null; }

  confirmVoid(): void {
    if (!this.voiding || this.voidBusy) return;
    const reason = this.reason.trim();
    if (!reason) { this.voidError = 'Escribe el motivo.'; return; }
    this.voidBusy = true;
    this.voidError = '';
    this.health.voidDeworming(this.voiding.id, reason).subscribe({
      next: () => {
        this.voidBusy = false;
        this.voiding = null;
        this.notice = 'Listo: la dosis quedó anulada y sigue en el historial.';
        this.loadOverview();
      },
      error: (e: HealthError) => { this.voidBusy = false; this.voidError = healthErrorText(e); }
    });
  }

  goBack(): void { history.back(); }
}
