import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { VetError, VetPreview } from 'src/app/models/veterinary.model';
import { VeterinaryService } from 'src/app/services/VeterinaryService/veterinary';
import { extractVetCode, isValidVetCode, normalizeVetCode, vetErrorText } from 'src/app/shared/utils/vet.util';

/**
 * Vincular clínica (Figma 2031:259 código/QR, 2031:295 errores, 2031:338 vista previa).
 * Dos pasos en la misma pantalla: escribir o escanear el código → vista previa → "Vincularme".
 * Tras vincularse lleva a "Compartir mascotas".
 */
@Component({
  selector: 'app-vet-link',
  templateUrl: './vet-link.page.html',
  styleUrls: ['./vet-link.page.scss'],
  standalone: false
})
export class VetLinkPage {
  step: 'code' | 'preview' = 'code';
  code = '';
  busy = false;
  scanning = false;
  error: { title: string; detail: string } | null = null;
  preview: VetPreview | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private vetService: VeterinaryService,
    private toast: ToastController
  ) {}

  ionViewWillEnter(): void {
    // Deep link o QR abierto desde fuera: /vet/link?code=VET-XXXXXXXX
    const fromUrl = extractVetCode(this.route.snapshot.queryParamMap.get('code') ?? '');
    this.step = 'code';
    this.preview = null;
    this.error = null;
    this.busy = false;
    if (fromUrl) {
      this.code = fromUrl;
      this.onContinue();
    }
  }

  onCodeInput(value: string): void {
    this.code = normalizeVetCode(value);
    this.error = null;
  }

  get canContinue(): boolean {
    return !this.busy && this.code.length > 0;
  }

  onContinue(): void {
    if (this.busy) return;
    this.code = normalizeVetCode(this.code);
    if (!isValidVetCode(this.code)) {
      this.error = vetErrorText({ code: 'INVALID_INVITE_CODE', status: 400, message: '' });
      return;
    }
    this.busy = true;
    this.error = null;
    this.vetService.previewByCode(this.code).subscribe({
      next: p => {
        this.busy = false;
        this.preview = p;
        this.step = 'preview';
      },
      error: (e: VetError) => this.fail(e)
    });
  }

  /**
   * Vincularme y pedir cita: para pedir una cita hay que estar vinculado (la cita exige compartir la mascota).
   * Se vincula y se va directo a Pedir cita, que comparte la mascota elegida si hace falta.
   */
  onLinkAndBook(): void {
    this.onLink(true);
  }

  onLink(andBook = false): void {
    if (this.busy || !this.preview) return;
    this.busy = true;
    this.error = null;
    this.vetService.link(this.code).subscribe({
      next: async res => {
        this.busy = false;
        const vetId = res.veterinaryId || this.preview?.veterinaryId || '';
        if (andBook && vetId) {
          if (!res.alreadyLinked) await this.showToast(`Te vinculaste a ${res.veterinaryName || this.preview?.name}. Ahora elige el servicio y la hora.`);
          this.router.navigate(['/vet/book', vetId], { replaceUrl: true });
          return;
        }
        if (res.alreadyLinked) {
          await this.showToast(`Ya estás vinculado a ${res.veterinaryName || this.preview?.name}`);
          this.router.navigate(['/vet/detail', res.veterinaryId], { replaceUrl: true });
          return;
        }
        this.router.navigate(['/vet/share', res.veterinaryId], { queryParams: { welcome: 1 }, replaceUrl: true });
      },
      error: (e: VetError) => {
        this.busy = false;
        this.step = 'code';
        this.fail(e);
      }
    });
  }

  onCancelPreview(): void {
    this.step = 'code';
    this.preview = null;
  }

  openScanner(): void { this.scanning = true; }

  onScanned(code: string): void {
    this.scanning = false;
    this.code = code;
    this.onContinue();
  }

  goBack(): void {
    if (this.step === 'preview') { this.onCancelPreview(); return; }
    this.router.navigate(['/vet']);
  }

  private fail(e: VetError): void {
    console.error('❌ Vincular clínica', e);
    this.busy = false;
    this.error = vetErrorText(e);
  }

  private async showToast(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2200, position: 'bottom' });
    await t.present();
  }
}
