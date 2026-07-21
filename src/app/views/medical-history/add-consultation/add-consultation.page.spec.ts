import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddConsultationPage } from './add-consultation.page';

describe('AddConsultationPage', () => {
  let component: AddConsultationPage;
  let fixture: ComponentFixture<AddConsultationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddConsultationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
