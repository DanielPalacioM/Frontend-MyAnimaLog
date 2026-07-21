import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { VaccineTimelineItem } from '../../shared/components/vaccine-timeline-card/vaccine-timeline-card.component';

@Component({
  selector: 'app-vaccine-timeline',
  templateUrl: './vaccine-timeline.page.html',
  styleUrls: ['./vaccine-timeline.page.scss'],
  standalone: false
})
export class VaccineTimelineComponent implements OnInit {

  petName = 'Milo';
  petAvatar = 'assets/images/Profile/cat-juan.png';

  appliedCount = 5;
  pendingCount = 2;
  lateCount = 1;
  totalCount = 8;

  selectedYear = 2026;
  years = [2025, 2026, 2027, 2028];

  vaccines: VaccineTimelineItem[] = [
    {
      id: '1',
      title: 'Parvovirus',
      applicationDate: '15 ene 2026',
      veterinary: 'Dr.pet',
      batch: 'PV-2026-001',
      status: 'applied',
      attachment: true,
      appointment: true,
    },
    {
      id: '2',
      title: 'Rabia',
      applicationDate: '5 mar 2026',
      veterinary: 'Dr.pet',
      batch: 'RB-342',
      status: 'applied',
      attachment: false,
      appointment: true,
    },
    {
      id: '3',
      title: 'Moquillo',
      dueDate: '20 jun 2026',
      veterinary: 'Dr.pet',
      batch: 'CDV-2024-MQ-0047',
      status: 'late',
      attachment: true,
      appointment: true,
    },
    {
      id: '4',
      title: 'Leptospirosis',
      dueDate: '18 ago 2026',
      status: 'pending',
      attachment: false,
      appointment: false,
    },
    {
      id: '5',
      title: 'Bordetella',
      status: 'suggested',
      attachment: false,
      appointment: false,
    },
  ];

  constructor(private router: Router) {}

  ngOnInit() {}

  get filteredVaccines(): VaccineTimelineItem[] {
    return this.vaccines;
  }

  get progressPercent(): number {
    return Math.round((this.appliedCount / this.totalCount) * 100);
  }

  onOpenVaccine(vaccine: VaccineTimelineItem) {
    this.router.navigate(['/vaccine-info', vaccine.id]);
  }

  goBack() {
    history.back();
  }

  goToRegister() {
    this.router.navigate(['/register-vaccine']);
  }
}