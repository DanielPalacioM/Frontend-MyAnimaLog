import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shared-profiles',
  templateUrl: './shared-profiles.page.html',
  styleUrls: ['./shared-profiles.page.scss'],
  standalone: false
})
export class SharedProfilesPage {

  constructor(private router: Router) {}

  goBack() {
    this.router.navigate(['/profile']);
  }

  onStartSharing() {
    // TODO: abrir flow de compartir mascota
  }
}