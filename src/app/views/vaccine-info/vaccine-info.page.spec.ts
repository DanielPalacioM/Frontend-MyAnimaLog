import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VaccineInfoPage } from './vaccine-info.page';

describe('VaccineInfoPage', () => {
  let component: VaccineInfoPage;
  let fixture: ComponentFixture<VaccineInfoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VaccineInfoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
