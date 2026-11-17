import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { LinkedVet, VetError } from 'src/app/models/veterinary.model';
import { PetService } from 'src/app/services/PetService/pet';
import { SharedProfileService } from 'src/app/services/SharedProfileService/shared-profile';
import { VeterinaryService } from 'src/app/services/VeterinaryService/veterinary';
import { petSubtitle, vetErrorText } from 'src/app/shared/utils/vet.util';

interface OwnPet { id: string; name: string; subtitle: string; selected: boolean; alreadyShared: boolean; }
interface CarePet { id: string; name: string; ownerName: string; role: string; }

/**
 * Compartir mascotas con una clínica (Figma 2031:384). Solo se ofrecen las mascotas propias:
 * las "a tu cuidado" salen deshabilitadas porque solo su dueño puede compartirlas.
 * Nada viene marcado de antemano: compartir la historia es una decisión del dueño.
 */
@Component({
  selector: 'app-vet-share',
  templateUrl: './vet-share.page.html',
  styleUrls: ['./vet-share.page.scss'],
  standalone: false
})
export class VetSharePage {
  vetId = '';
  vet: LinkedVet | null = null;
  welcome = false;
  loading = true;
  loadError = false;
  busy = false;
  error: { title: string; detail: string } | null = null;
  own: OwnPet[] = [];
  care: CarePet[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vetService: VeterinaryService,
    private petService: PetService,
    private sharedProfiles: SharedProfileService,
    private toast: ToastController
  ) {}

  ionViewWillEnter(): void {
    this.vetId = this.route.snapshot.paramMap.get('vetId') ?? '';
    this.welcome = this.route.snapshot.queryParamMap.get('welcome') === '1';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.error = null;
    forkJoin({
      vets: this.vetService.getLinked(),
      pets: this.petService.getPets(),
      care: this.sharedProfiles.getPetsInMyCare().pipe(catchError(() => of([])))
    }).pipe(
      switchMap(r =>
        this.vetService.loadSharing(r.pets.map(p => ({ id: p.id, name: p.name }))).pipe(map(sharing => ({ ...r, sharing })))
      )
    ).subscribe({
      next: ({ vets, pets, care, sharing }) => {
        this.vet = vets.find(v => v.veterinaryId === this.vetId) ?? null;
        const sharedIds = new Set((sharing.get(this.vetId) ?? []).map(p => p.id));
        this.own = pets.map(p => ({
          id: p.id,
          name: p.name,
          subtitle: petSubtitle(p),
          selected: false,
          alreadyShared: sharedIds.has(p.id),
        }));
        this.care = care.map((p: any) => ({
          id: p.id, name: p.name, ownerName: p.ownerName ?? 'otra persona', role: p.accessRole === 'VIEWER' ? 'visor' : 'editor',
        }));
        this.loadError = !this.vet;
        this.loading = false;
      },
      error: (e: VetError) => {
        console.error('❌ Compartir mascotas: no se pudo cargar', e);
        this.loadError = true;
        this.loading = false;
      }
    });
  }

  initial(name: string): string { return (name || '?')[0].toUpperCase(); }

  toggle(p: OwnPet): void {
    if (p.alreadyShared || this.busy) return;
    p.selected = !p.selected;
    this.error = null;
  }

  get selectedCount(): number { return this.own.filter(p => p.selected).length; }

  get shareLabel(): string {
    const n = this.selectedCount;
    return n === 0 ? 'Elige una mascota' : n === 1 ? 'Compartir 1 mascota' : `Compartir ${n} mascotas`;
  }

  onShare(): void {
    const ids = this.own.filter(p => p.selected).map(p => p.id);
    if (!ids.length || this.busy) return;
    this.busy = true;
    this.error = null;
    this.vetService.sharePets(this.vetId, ids).subscribe({
      next: async res => {
        this.busy = false;
        const names = res.pets.map(p => p.petName).filter(Boolean).join(', ');
        await this.showToast(names ? `${names}: la clínica ya puede ver su historia` : 'Mascotas compartidas');
        this.goDetail();
      },
      error: (e: VetError) => {
        console.error('❌ Compartir mascotas', e);
        this.busy = false;
        this.error = vetErrorText(e);
      }
    });
  }

  goDetail(): void {
    this.router.navigate(['/vet/detail', this.vetId], { replaceUrl: true });
  }

  goBack(): void {
    this.router.navigate(['/vet']);
  }

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2400, position: 'bottom' });
    await t.present();
  }
}
