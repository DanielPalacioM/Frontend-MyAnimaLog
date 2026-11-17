import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { PetVet, VetError } from 'src/app/models/veterinary.model';
import { Pet, PetService } from 'src/app/services/PetService/pet';
import { VeterinaryService } from 'src/app/services/VeterinaryService/veterinary';
import { petSubtitle, vetDate, vetErrorText } from 'src/app/shared/utils/vet.util';

/**
 * "Clínicas con acceso" de una mascota (Figma 2032:416) y su hoja "Quitar acceso" (2032:469).
 * Solo el dueño la ve: el backend responde 403 PET_NOT_OWNED a cualquier otro.
 * La "Última visita" del diseño no está: Medical todavía no devuelve la clínica de cada registro.
 */
@Component({
  selector: 'app-pet-clinics',
  templateUrl: './pet-clinics.page.html',
  styleUrls: ['./pet-clinics.page.scss'],
  standalone: false
})
export class PetClinicsPage {
  petId = '';
  pet: Pet | null = null;
  clinics: PetVet[] = [];
  loading = true;
  loadError: { title: string; detail: string } | null = null;
  error: { title: string; detail: string } | null = null;

  revoking: PetVet | null = null;
  revokeBusy = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vetService: VeterinaryService,
    private petService: PetService,
    private toast: ToastController
  ) {}

  ionViewWillEnter(): void {
    this.petId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = null;
    this.error = null;
    this.petService.getPetById(this.petId).subscribe({
      next: p => (this.pet = p),
      error: err => console.error('❌ No se pudo cargar la mascota', err)
    });
    this.vetService.getVetsForPet(this.petId).subscribe({
      next: clinics => {
        this.clinics = clinics;
        this.loading = false;
      },
      error: (e: VetError) => {
        console.error('❌ Clínicas con acceso', e);
        this.loadError = e.code === 'PET_NOT_OWNED'
          ? { title: 'Solo el dueño ve esto', detail: 'Las clínicas con acceso las gestiona quien registró la mascota.' }
          : vetErrorText(e);
        this.loading = false;
      }
    });
  }

  get subtitle(): string { return this.pet ? petSubtitle(this.pet) : ''; }
  get initial(): string { return (this.pet?.name || '?')[0].toUpperCase(); }
  since(c: PetVet): string { return vetDate(c.grantedAt); }

  askRevoke(c: PetVet): void { this.revoking = c; this.error = null; }
  closeRevoke(): void { if (!this.revokeBusy) this.revoking = null; }

  confirmRevoke(): void {
    const c = this.revoking;
    if (!c || this.revokeBusy) return;
    this.revokeBusy = true;
    this.vetService.revokePet(c.veterinaryId, this.petId).subscribe({
      next: async () => {
        this.revokeBusy = false;
        this.clinics = this.clinics.filter(x => x.veterinaryId !== c.veterinaryId);
        this.revoking = null;
        await this.showToast(`${c.name} ya no ve a ${this.pet?.name ?? 'tu mascota'}`);
      },
      error: (e: VetError) => {
        console.error('❌ Quitar acceso', e);
        this.revokeBusy = false;
        this.revoking = null;
        this.error = vetErrorText(e);
      }
    });
  }

  goBack(): void { this.router.navigate(['/pet-profile', this.petId]); }
  goVet(): void { this.router.navigate(['/vet']); }

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2400, position: 'bottom' });
    await t.present();
  }
}
