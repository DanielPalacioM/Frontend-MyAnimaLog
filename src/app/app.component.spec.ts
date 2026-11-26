import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent, SPLASH_MIN_MS, hideSplash } from './app.component';

describe('AppComponent', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('la pantalla de carga espera a que el perrito salude y luego se va', fakeAsync(() => {
    const el = document.createElement('div');
    el.id = 'boot-splash';
    document.body.appendChild(el);
    hideSplash(document, 400);
    tick(SPLASH_MIN_MS - 400 - 1);
    expect(el.classList).not.toContain('gone');
    tick(1);
    expect(el.classList).toContain('gone');
    tick(400);
    expect(document.getElementById('boot-splash')).toBeNull();
  }));

});
