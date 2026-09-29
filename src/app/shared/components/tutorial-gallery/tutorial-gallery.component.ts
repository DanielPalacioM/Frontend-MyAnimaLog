import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { TutorialSlide } from 'src/app/services/TutorialService/tutorial';

const SWIPE_THRESHOLD = 50;

/** Tutorial con imágenes: diapositivas a pantalla completa que se deslizan. */
@Component({
  selector: 'app-tutorial-gallery',
  templateUrl: './tutorial-gallery.component.html',
  styleUrls: ['./tutorial-gallery.component.scss'],
  standalone: false
})
export class TutorialGalleryComponent implements OnChanges {

  @Input() slides: TutorialSlide[] = [];
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  index = 0;
  // Imágenes que no cargaron (todavía no están en assets): se muestra un marcador.
  missing = new Set<string>();

  private touchStartX = 0;

  get isLast(): boolean { return this.index === this.slides.length - 1; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) this.index = 0;
  }

  next(): void {
    if (this.isLast) {
      this.closed.emit();
      return;
    }
    this.index++;
  }

  prev(): void {
    if (this.index > 0) this.index--;
  }

  goTo(i: number): void {
    this.index = i;
  }

  onImageError(slide: TutorialSlide): void {
    this.missing.add(slide.image);
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent): void {
    const delta = event.changedTouches[0].screenX - this.touchStartX;
    if (delta <= -SWIPE_THRESHOLD && !this.isLast) this.index++;
    else if (delta >= SWIPE_THRESHOLD) this.prev();
  }
}
