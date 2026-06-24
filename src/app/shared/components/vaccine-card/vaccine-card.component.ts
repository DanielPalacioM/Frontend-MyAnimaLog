import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface VaccineSummary {
  appliedCount: number;
  totalCount: number;
  nextVaccineName: string | null;
  nextVaccineDate: Date | null;
  daysUntilNext: number | null;
}

@Component({
  selector: 'app-vaccine-card',
  templateUrl: './vaccine-card.component.html',
  styleUrls: ['./vaccine-card.component.scss'],
  standalone: false
})
export class VaccineCardComponent {

  @Input() summary: VaccineSummary = {
    appliedCount: 0,
    totalCount: 0,
    nextVaccineName: null,
    nextVaccineDate: null,
    daysUntilNext: null,
  };

  @Output() addVaccine = new EventEmitter<void>();
  @Output() viewTimeline = new EventEmitter<void>();

  get progressPercent(): number {
    if (!this.summary.totalCount) return 0;
    return Math.round((this.summary.appliedCount / this.summary.totalCount) * 100);
  }

  onAdd() {
    this.addVaccine.emit();
  }

  onViewTimeline() {
    this.viewTimeline.emit();
  }
}