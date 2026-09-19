import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-add-record',
  templateUrl: './add-record.page.html',
  styleUrls: ['./add-record.page.scss'],
  standalone: false
})
export class AddRecordPage implements OnInit {

  selectedCategory: string | null = null;
  petId: string = '';

  categories = [
    {
      key: 'consultation',
      title: 'Consulta Veterinaria',
      desc: 'Visita, diagnóstico, temperatura, peso',
      icon: 'assets/images/MH/ConsultasIcon.png',
      color: '#4037BE',
      bg: '#EEF0FF',
      route: '/add-consultation'
    },
    {
      key: 'treatment',
      title: 'Tratamiento',
      desc: 'Medicamentos, duración, progreso',
      icon: 'assets/images/MH/TratamientosIcon.png',
      color: '#e65100',
      bg: '#FFF5E6',
      route: '/add-treatment'
    },
    {
      key: 'lab',
      title: 'Examen de laboratorio',
      desc: 'Resultados, Rangos normales, notas',
      icon: 'assets/images/MH/LabIcon.png',
      color: '#2e7d32',
      bg: '#E8F5E9',
      route: '/add-lab'
    },
    {
      key: 'surgery',
      title: 'Cirugía',
      desc: 'Procedimiento, Anestesia, Recuperación',
      icon: 'assets/images/MH/CirugiasIcon.png',
      color: '#c2185b',
      bg: '#FCE4EC',
      route: '/add-surgery'
    },
  ];

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
  }

  goTo(route: string) {
    this.router.navigate([route, this.petId]);
  }

  goBack() { history.back(); }

  selectCategory(key: string, route: string) {
    this.selectedCategory = key;
    setTimeout(() => this.router.navigate([route, this.petId]), 200);
  }
}