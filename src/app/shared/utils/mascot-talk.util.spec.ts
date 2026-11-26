import { CommonModule } from '@angular/common';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HomeGreetingComponent } from '../components/home-greeting/home-greeting.component';
import { MascotComponent } from '../components/mascot/mascot.component';
import { GreetingView } from './home-today.util';
import { DAY_TALK, NIGHT_TALK, SAY_MS, mascotReaction } from './mascot-talk.util';

describe('Perrito: lo que dice y hace al tocarlo', () => {
  it('cada toque es distinto y la lista vuelve a empezar', () => {
    const says = DAY_TALK.map((_, i) => mascotReaction(i, false).say);
    expect(new Set(says).size).toBe(DAY_TALK.length);
    expect(mascotReaction(DAY_TALK.length, false)).toEqual(DAY_TALK[0]);
  });

  it('de noche se despierta y habla bajito', () => {
    expect(mascotReaction(0, true).act).toBe('wake');
    expect(NIGHT_TALK.some(r => r.say.includes('minutitos'))).toBeTrue();
  });

  it('la última invita a hablar con la IA', () => {
    expect(DAY_TALK[DAY_TALK.length - 1].chat).toBeTrue();
    expect(NIGHT_TALK[NIGHT_TALK.length - 1].chat).toBeTrue();
  });
});

describe('HomeGreetingComponent: toques al perrito', () => {
  const view: GreetingView = { mood: 'afternoon', pose: 'hello', date: 'Martes', title: '¡Hola!', line: 'Todo bien', bubble: '¡Bien!' };

  beforeEach(() => TestBed.configureTestingModule({ imports: [CommonModule], declarations: [HomeGreetingComponent, MascotComponent] }));

  function setup() {
    spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => { cb(0); return 0; });
    const f = TestBed.createComponent(HomeGreetingComponent);
    f.componentInstance.view = view;
    f.detectChanges();
    const tap = () => { (f.nativeElement.querySelector('.stage') as HTMLButtonElement).click(); f.detectChanges(); };
    const bubble = () => (f.nativeElement.querySelector('.bubble') as HTMLElement).textContent!.trim();
    const dog = () => f.nativeElement.querySelector('app-mascot') as HTMLElement;
    return { f, tap, bubble, dog };
  }

  it('cada toque cambia el diálogo y el movimiento; el globo vuelve solo al del saludo', fakeAsync(() => {
    const { f, tap, bubble, dog } = setup();
    expect(bubble()).toBe('¡Bien!');
    tap();
    expect(bubble()).toBe(DAY_TALK[0].say);
    expect(dog().classList).toContain('act-wave');
    tap();
    expect(bubble()).toBe(DAY_TALK[1].say);
    expect(dog().classList).toContain('act-jump');
    tick(SAY_MS);
    f.detectChanges();
    expect(bubble()).toBe('¡Bien!');
    tick(2000);
  }));

  it('no abre el chat hasta que el perrito lo ofrece; el toque siguiente sí lo abre', fakeAsync(() => {
    const { f, tap } = setup();
    let opened = 0;
    f.componentInstance.dogTap.subscribe(() => opened++);
    for (let i = 0; i < DAY_TALK.length; i++) tap();
    expect(opened).toBe(0);
    expect(f.componentInstance.chatNext).toBeTrue();
    tap();
    expect(opened).toBe(1);
    expect(f.componentInstance.chatNext).toBeFalse();
    tick(SAY_MS + 3000);
  }));
});
