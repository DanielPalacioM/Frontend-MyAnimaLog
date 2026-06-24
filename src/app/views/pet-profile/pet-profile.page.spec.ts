import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PetProfilePage } from './pet-profile.page';

describe('PetProfilePage', () => {
  let component: PetProfilePage;
  let fixture: ComponentFixture<PetProfilePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PetProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
