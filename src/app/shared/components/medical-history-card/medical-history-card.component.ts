import { Component, EventEmitter, Input, Output } from '@angular/core';

export type MedicalHistorySection = 'visits' | 'treatments' | 'lab' | 'surgeries';

export interface MedicalHistorySummary {
  section: MedicalHistorySection;
  label: string;
  count: number;
  icon: string;
}

@Component({
  selector: 'app-medical-history-card',
  templateUrl: './medical-history-card.component.html',
  styleUrls: ['./medical-history-card.component.scss'],
  standalone: false
})
export class MedicalHistoryCardComponent {

  @Input() items: MedicalHistorySummary[] = [
    { section: 'visits',     label: 'Visitas veterinarias', count: 0, icon: 'medical-outline' },
    { section: 'treatments', label: 'Tratamientos',         count: 0, icon: 'bandage-outline' },
    { section: 'lab',        label: 'Lab',                  count: 0, icon: 'flask-outline' },
    { section: 'surgeries',  label: 'Cirugías',              count: 0, icon: 'cut-outline' },
  ];

  @Output() sectionSelected = new EventEmitter<MedicalHistorySection>();
  @Output() viewAll = new EventEmitter<void>();

  onSelect(section: MedicalHistorySection) {
    this.sectionSelected.emit(section);
  }

  onViewAll() {
    this.viewAll.emit();
  }
}