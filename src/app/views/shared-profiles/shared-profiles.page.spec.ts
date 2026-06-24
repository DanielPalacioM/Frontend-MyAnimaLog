import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedProfilesPage } from './shared-profiles.page';

describe('SharedProfilesPage', () => {
  let component: SharedProfilesPage;
  let fixture: ComponentFixture<SharedProfilesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SharedProfilesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
