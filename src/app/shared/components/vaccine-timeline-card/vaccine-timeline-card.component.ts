import { Component, EventEmitter, Input, Output } from '@angular/core';

export type VaccineStatus =
  | 'applied'
  | 'pending'
  | 'late'
  | 'suggested';

export interface VaccineTimelineItem {

  id: string;

  title: string;

  applicationDate?: string;

  dueDate?: string;

  veterinary?: string;

  batch?: string;

  status: VaccineStatus;

  attachment?: boolean;

  appointment?: boolean;

}

@Component({
  selector: 'app-vaccine-timeline-card',
  templateUrl: './vaccine-timeline-card.component.html',
  styleUrls: ['./vaccine-timeline-card.component.scss'],
  standalone: false
})
export class VaccineTimelineCardComponent {

  @Input() vaccine!: VaccineTimelineItem;
  @Input() isLast = false;
  @Output() open = new EventEmitter<VaccineTimelineItem>();

  onOpen(): void {
    this.open.emit(this.vaccine);
  }

  

  get backgroundColor(): string {

    switch (this.vaccine.status) {

      case 'applied':
        return '#DBE9FF';

      case 'late':
        return '#FFF5F5';

      case 'pending':
        return '#FFDEAC';

      default:
        return '#D6D8DA';

    }

  }

  get statusText(): string {

    switch (this.vaccine.status) {

      case 'applied':
        return 'Aplicada';

      case 'late':
        return 'Retrasada';

      case 'pending':
        return 'En espera';

      default:
        return 'Sugerida';

    }

  }

}