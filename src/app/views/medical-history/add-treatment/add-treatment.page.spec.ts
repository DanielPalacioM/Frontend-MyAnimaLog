import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddTreatmentPage } from './add-treatment.page';

describe('AddTreatmentPage', () => {
  let component: AddTreatmentPage;
  let fixture: ComponentFixture<AddTreatmentPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddTreatmentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
