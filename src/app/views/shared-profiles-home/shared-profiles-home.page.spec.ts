import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedProfilesHomePage } from './shared-profiles-home.page';

describe('SharedProfilesHomePage', () => {
  let component: SharedProfilesHomePage;
  let fixture: ComponentFixture<SharedProfilesHomePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SharedProfilesHomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
