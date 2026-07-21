import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shared-profiles',
  templateUrl: './shared-profiles.page.html',
  styleUrls: ['./shared-profiles.page.scss'],
  standalone: false
})
export class SharedProfilesPage implements OnInit {

  constructor(private router: Router) {}

  ngOnInit() {
    if (localStorage.getItem('sharedProfilesVisited') === 'true') {
      this.router.navigate(['/shared-profiles-home']);
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  onStartSharing() {
    localStorage.setItem('sharedProfilesVisited', 'true');
    this.router.navigate(['/shared-profiles-home']);
  }
}