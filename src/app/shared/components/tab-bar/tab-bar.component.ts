import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

export type TabKey =
  | 'home'
  | 'veterinary'
  | 'shared-profile'
  | 'calendar'
  | 'pet-profile';

interface TabDef {
  key: TabKey;
  label: string;
  icon: string;
  activeIcon: string;
  route: string;
}

@Component({
  selector: 'app-tab-bar',
  templateUrl: './tab-bar.component.html',
  styleUrls: ['./tab-bar.component.scss'],
  standalone: false
})
export class TabBarComponent {

  @Input() activeTab?: TabKey;

  readonly tabs: TabDef[] = [
  {
    key: 'home',
    label: 'Home',
    icon: 'Home.png',
    activeIcon: 'Home.png',
    route: '/home'
  },
  {
    key: 'shared-profile',
    label: 'Shared',
    icon: 'SharedProfile.png',
    activeIcon: 'SharedProfile.png',
    route: '/shared-profiles'
  },
  {
    key: 'pet-profile',
    label: 'Pet Profile',
    icon: 'PetProfile.png',
    activeIcon: 'PetProfile.png',
    route: '/pet-profile'
  },
  {
    key: 'calendar',
    label: 'Calendar',
    icon: 'Calendar.png',
    activeIcon: 'Calendar.png',
    route: '/calendar'
  },
  {
    key: 'veterinary',
    label: 'Vet',
    icon: 'Veterinary.png',
    activeIcon: 'Veterinary.png',
    route: '/veterinary'
  },
];

  constructor(private router: Router) {}

  goTo(route: string): void {
    this.router.navigate([route]);
  }

  isActive(tab: TabDef): boolean {
    if (this.activeTab) {
      return this.activeTab === tab.key;
    }

    return this.router.url.startsWith(tab.route);
  }

  getIcon(tab: TabDef): string {
    return this.isActive(tab)
      ? tab.activeIcon
      : tab.icon;
  }
}