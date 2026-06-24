import { Component, Input } from '@angular/core';

export interface PetStats {
  age: string;
  weight: string;
  gender: string;
  height: string;
}

@Component({
  selector: 'app-pet-stats-card',
  templateUrl: './pet-stats-card.component.html',
  styleUrls: ['./pet-stats-card.component.scss'],
  standalone: false
})
export class PetStatsCardComponent {

  @Input() stats: PetStats = {
    age: '',
    weight: '',
    gender: '',
    height: '',
  };

}