import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddSurgeryPage } from './add-surgery.page';

describe('AddSurgeryPage', () => {
  let component: AddSurgeryPage;
  let fixture: ComponentFixture<AddSurgeryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddSurgeryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
