import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import jsQR from 'jsqr';
import { extractVetCode } from '../../utils/vet.util';

/**
 * Lector del QR de la clínica. Usa la cámara trasera (getUserMedia: pide HTTPS o localhost) y jsQR
 * sobre un fotograma cada ~150 ms. Emite el código `VET-XXXXXXXX` aunque el QR traiga un enlace con él dentro.
 * Si no hay cámara o se niega el permiso, avisa y deja escribir el código a mano.
 */
@Component({
  selector: 'app-qr-scanner',
  templateUrl: './qr-scanner.component.html',
  styleUrls: ['./qr-scanner.component.scss'],
  standalone: false
})
export class QrScannerComponent implements OnDestroy {
  @Input() set open(v: boolean) {
    if (v && !this._open) void this.start();
    if (!v && this._open) this.stop();
    this._open = v;
  }
  @Output() scanned = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;

  _open = false;
  error = '';
  private stream?: MediaStream;
  private timer?: ReturnType<typeof setInterval>;
  private canvas = document.createElement('canvas');

  private async start(): Promise<void> {
    this.error = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.error = 'Este dispositivo no permite abrir la cámara. Escribe el código a mano.';
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      // El <video> se pinta con *ngIf al abrir: esperar un ciclo para tener la referencia.
      await new Promise(r => setTimeout(r));
      const video = this.videoRef?.nativeElement;
      if (!video) { this.stop(); return; }
      video.srcObject = this.stream;
      await video.play();
      this.timer = setInterval(() => this.tick(video), 150);
    } catch (err) {
      console.error('❌ No se pudo abrir la cámara', err);
      this.error = 'No pudimos abrir la cámara. Revisa el permiso o escribe el código a mano.';
      this.stop();
    }
  }

  private tick(video: HTMLVideoElement): void {
    if (video.readyState < 2 || !video.videoWidth) return;
    const w = video.videoWidth, h = video.videoHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const result = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
    if (!result) return;
    const code = extractVetCode(result.data);
    if (code) {
      this.stop();
      this.scanned.emit(code);
    } else {
      this.error = 'Ese QR no es de una clínica de MyAnimaLog.';
    }
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = undefined;
  }

  close(): void {
    this.stop();
    this.closed.emit();
  }

  ngOnDestroy(): void { this.stop(); }
}
