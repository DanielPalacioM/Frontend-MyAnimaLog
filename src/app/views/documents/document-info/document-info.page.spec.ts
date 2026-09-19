import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentInfoPage } from './document-info.page';

describe('DocumentInfoPage', () => {
  let component: DocumentInfoPage;
  let fixture: ComponentFixture<DocumentInfoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DocumentInfoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
