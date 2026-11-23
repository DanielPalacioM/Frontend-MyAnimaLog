import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { LinkedVet, VetError } from 'src/app/models/veterinary.model';
import { PetService } from 'src/app/services/PetService/pet';
import { VeterinaryService } from 'src/app/services/VeterinaryService/veterinary';
import { vetDate, vetErrorText } from 'src/app/shared/utils/vet.util';

interface PetSwitch { id: string; name: string; shared: boolean; grantedAt: string; busy: boolean; }

/**
 * Detalle de una clínica vinculada (Figma 2032:279) y su hoja "¿Desvincularte?" (2032:342).
 * Cada mascota propia lleva un interruptor: encender comparte, apagar revoca (el backend corta el acceso
 * en menos de un minuto y no borra lo que la clínica ya registró).
 */
@Component({
  selector: 'app-vet-detail',
  templateUrl: './vet-detail.page.html',
  styleUrls: ['./vet-detail.page.scss'],
  standalone: false
})
export class VetDetailPage {
  vetId = '';
  vet: LinkedVet | null = null;
  pets: PetSwitch[] = [];
  loading = true;
  loadError = false;
  error: { title: string; detail: string } | null = null;

  unlinkOpen = false;
  unlinking = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vetService: VeterinaryService,
    private petService: PetService,
    private toast: ToastController
  ) {}

  ionViewWillEnter(): void {
    this.vetId = this.route.snapshot.paramMap.get('vetId') ?? '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.error = null;
    forkJoin({ vets: this.vetService.getLinked(), pets: this.petService.getPets() }).pipe(
      switchMap(r =>
        this.vetService.loadSharing(r.pets.map(p => ({ id: p.id, name: p.name }))).pipe(map(sharing => ({ ...r, sharing })))
      )
    ).subscribe({
      next: ({ vets, pets, sharing }) => {
        this.vet = vets.find(v => v.veterinaryId === this.vetId) ?? null;
        const mine = new Map((sharing.get(this.vetId) ?? []).map(p => [p.id, p.grantedAt ?? '']));
        this.pets = pets.map(p => ({
          id: p.id, name: p.name, shared: mine.has(p.id), grantedAt: mine.get(p.id) ?? '', busy: false,
        }));
        this.loadError = !this.vet;
        this.loading = false;
      },
      error: (e: VetError) => {
        console.error('❌ Detalle de clínica: no se pudo cargar', e);
        this.loadError = true;
        this.loading = false;
      }
    });
  }

  get linkedSince(): string { return vetDate(this.vet?.linkedAt ?? ''); }

  subtitle(p: PetSwitch): string {
    if (!p.shared) return 'No compartido';
    const d = vetDate(p.grantedAt);
    return d ? `Compartido el ${d} · ve su historia` : 'Compartido · ve su historia';
  }

  initial(name: string): string { return (name || '?')[0].toUpperCase(); }

  togglePet(p: PetSwitch): void {
    if (p.busy) return;
    const next = !p.shared;
    p.busy = true;
    p.shared = next;            // optimista; se revierte si el backend rechaza
    this.error = null;
    const call$: Observable<unknown> = next ? this.vetService.sharePets(this.vetId, [p.id]) : this.vetService.revokePet(this.vetId, p.id);
    call$.subscribe({
      next: () => {
        p.busy = false;
        if (next) p.grantedAt = new Date().toISOString();
      },
      error: (e: VetError) => {
        console.error('❌ Cambiar acceso de la mascota', e);
        p.busy = false;
        p.shared = !next;
        this.error = vetErrorText(e);
      }
    });
  }

  get sharedNames(): string {
    return this.pets.filter(p => p.shared).map(p => p.name).join(', ');
  }

  openUnlink(): void { this.unlinkOpen = true; }
  closeUnlink(): void { if (!this.unlinking) this.unlinkOpen = false; }

  confirmUnlink(): void {
    if (this.unlinking) return;
    this.unlinking = true;
    this.vetService.unlink(this.vetId).subscribe({
      next: async () => {
        this.unlinking = false;
        this.unlinkOpen = false;
        await this.showToast(`Te desvinculaste de ${this.vet?.name ?? 'la clínica'}`);
        this.router.navigate(['/vet'], { replaceUrl: true });
      },
      error: (e: VetError) => {
        console.error('❌ Desvincularme', e);
        this.unlinking = false;
        this.unlinkOpen = false;
        this.error = vetErrorText(e);
      }
    });
  }

  call(): void {
    if (!this.vet?.phone) return;
    window.open(`tel:${this.vet.phone.replace(/\s/g, '')}`, '_self');
  }

  directions(): void {
    if (!this.vet) return;
    const q = encodeURIComponent(`${this.vet.name} ${this.vet.city}`.trim());
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  }

  bookAppointment(): void { this.router.navigate(['/vet/book', this.vetId]); }

  myAppointments(): void { this.router.navigate(['/vet/appointments'], { queryParams: { veterinaryId: this.vetId } }); }

  goBack(): void { this.router.navigate(['/vet']); }

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2400, position: 'bottom' });
    await t.present();
  }
}
