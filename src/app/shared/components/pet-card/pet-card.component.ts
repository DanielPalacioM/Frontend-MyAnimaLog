import { Component, Input, OnInit } from '@angular/core';

export interface pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  imageUrl: string;

  birthDate?: string;
  gender?: string;
  caregivers?: {
    name: string;
    avatarUrl: string;
  }[];
}

@Component({
  selector: 'app-pet-card',
  templateUrl: './pet-card.component.html',
  styleUrls: ['./pet-card.component.scss'],
  standalone: false
})
export class PetCardComponent{

  @Input() pet!: pet;



}
