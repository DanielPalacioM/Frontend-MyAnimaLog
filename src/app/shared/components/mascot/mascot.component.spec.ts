import { Component } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MascotPose } from 'src/app/shared/utils/home-today.util';
import { MascotComponent } from './mascot.component';

@Component({
  template: `<app-mascot class="dog" [pose]="pose" [intro]="intro"></app-mascot>`,
  standalone: false
})
class HostComponent {
  pose: MascotPose = 'hello';
  intro = true;
}

describe('MascotComponent (perrito por capas)', () => {
  beforeEach(() => TestBed.configureTestingModule({ declarations: [MascotComponent, HostComponent] }));

  function render(pose: MascotPose, intro: boolean): HTMLElement {
    const f = TestBed.createComponent(HostComponent);
    f.componentInstance.pose = pose;
    f.componentInstance.intro = intro;
    f.detectChanges();
    return f.nativeElement.querySelector('app-mascot');
  }

  it('trae todas las capas que se animan', () => {
    const el = render('hello', true);
    for (const part of ['shadow', 'dog', 'joy', 'tail', 'body', 'chest', 'head', 'head-pose', 'ear-l', 'ear-r', 'eye-l', 'eye-r', 'leg']) {
      expect(el.querySelector(`svg .${part}`)).withContext(part).not.toBeNull();
    }
  });

  it('la pose y la entrada van como clases del host, sin perder las del padre', () => {
    const el = render('curious', true);
    expect(el.classList).toContain('dog');
    expect(el.classList).toContain('pose-curious');
    expect(el.classList).toContain('intro');
  });

  it('sin entrada (segunda visita en la sesión) queda en su pose, sin salto', () => {
    const el = render('sleep', false);
    expect(el.classList).toContain('pose-sleep');
    expect(el.classList).not.toContain('intro');
  });

  it('piensa: la pose de la IA mientras responde', () => {
    expect(render('think', false).classList).toContain('pose-think');
  });

  it('greet() vuelve a saludar con la pata (act-wave) y después se calma', fakeAsync(() => {
    const f = TestBed.createComponent(MascotComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => { cb(0); return 0; });
    f.componentInstance.greet();
    f.detectChanges();
    expect(el.classList).toContain('act-wave');
    tick(1200);
    f.detectChanges();
    expect(el.classList).not.toContain('act-wave');
  }));
});
