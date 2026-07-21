import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddLabPage } from './add-lab.page';

describe('AddLabPage', () => {
  let component: AddLabPage;
  let fixture: ComponentFixture<AddLabPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddLabPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
