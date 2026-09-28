import { Directive, HostListener, Input } from '@angular/core';

// Si la foto (de un usuario o mascota) no carga, pone una imagen por defecto
// en vez de dejar el ícono de imagen rota.
@Directive({
  selector: 'img[appImgFallback]',
  standalone: false
})
export class ImgFallbackDirective {
  @Input() appImgFallback = 'assets/images/default-avatar.svg';

  @HostListener('error', ['$event.target'])
  onError(img: HTMLImageElement) {
    const fallback = this.appImgFallback || 'assets/images/default-avatar.svg';
    if (!img.src.endsWith(fallback)) img.src = fallback;
  }
}
