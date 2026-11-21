import { fakeAsync, flush, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AiChat, AiError, AiMessage } from 'src/app/models/ai-chat.model';
import { AiConversationService } from 'src/app/services/AiConversationService/ai-conversation';
import { AiChatPage } from './ai-chat.page';

const err = (code: AiError['code']): AiError => ({ code, status: 0, message: '' });
const file = (name: string, type: string, size = 100) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};
const pickEvent = (...files: File[]) => ({ target: { files, value: 'x' } } as unknown as Event);
const flatChats = (groups: { chats: AiChat[] }[]): AiChat[] => groups.reduce((acc, g) => acc.concat(g.chats), [] as AiChat[]);
const m = (role: 'user' | 'assistant', text: string): AiMessage => ({ id: text, role, text, createdAt: '2026-11-18T10:00:00Z' });
const chatOf = (id: string, text: string, updatedAt = '2026-11-18T10:00:00Z'): AiChat => ({
  id, title: text, createdAt: updatedAt, updatedAt, messages: [m('user', text), m('assistant', 'respuesta a ' + text)],
});

// La pantalla usa el servicio de conversación real (compartido con el mini chat) sobre un almacenamiento simulado.
describe('AiChatPage', () => {
  let api: any;
  let toast: any;
  let nav: any;
  let access: any;
  let store: AiChat[];
  let active: string | null;
  let confirmAnswer: boolean;
  let conv: AiConversationService;

  const make = (opts: { seenIntro?: boolean; chats?: AiChat[]; active?: string | null; username?: string; host?: any } = {}) => {
    store = opts.chats ?? [];
    active = opts.active ?? null;
    confirmAnswer = true;
    api = {
      fetchConversations: () => of([]), fetchMessages: () => of([]),
      listChats: () => [...store].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      getActiveChatId: () => active,
      setActiveChatId: jasmine.createSpy('setActive').and.callFake((id: string | null) => (active = id)),
      saveChat: jasmine.createSpy('saveChat').and.callFake((c: AiChat) => { store = [c, ...store.filter(x => x.id !== c.id)]; }),
      deleteChat: jasmine.createSpy('deleteChat').and.callFake((id: string) => { store = store.filter(c => c.id !== id); }),
      deleteAllChats: jasmine.createSpy('deleteAll').and.callFake(() => { store = []; }),
      hasSeenIntro: () => !!opts.seenIntro,
      markIntroSeen: jasmine.createSpy('markIntroSeen'),
      send: jasmine.createSpy('send').and.returnValue(of({ reply: 'Respuesta de prueba' })),
      confirmAction: jasmine.createSpy('confirmAction').and.returnValue(of({ reply: 'Listo.' })),
      rejectAction: jasmine.createSpy('rejectAction').and.returnValue(of({ reply: '' })),
    };
    conv = new AiConversationService(api);
    toast = { create: jasmine.createSpy('toast').and.returnValue(Promise.resolve({ present: () => Promise.resolve() })) };
    nav = { navigateBack: jasmine.createSpy('navigateBack') };
    access = { takeLaunchOrigin: jasmine.createSpy('takeLaunchOrigin').and.returnValue(null), closeMini: jasmine.createSpy('closeMini') };
    // El diálogo de confirmación: pulsa el botón de confirmar (o "Cancelar") al abrirse.
    const alert = {
      create: (o: any) => Promise.resolve({
        present: () => { (confirmAnswer ? o.buttons[1] : o.buttons[0]).handler(); return Promise.resolve(); },
        onDidDismiss: () => new Promise(() => undefined),
      }),
    };
    const profile: any = { getProfile: () => of({ username: opts.username ?? 'Luis Santiago' }) };
    return new AiChatPage(conv, api, profile, toast, alert as any, { nativeElement: opts.host ?? {} } as any, access, nav);
  };

  describe('saludo', () => {
    it('la primera vez se presenta en varios mensajes, uno a uno, y marca la presentación como vista', fakeAsync(() => {
      const p = make({ seenIntro: false });
      p.ionViewWillEnter();
      expect(p.greeting).toBe('¡Hola, Luis!');
      expect(p.shown.length).toBe(0);
      expect(p.typing).toBeTrue();
      expect(api.markIntroSeen).toHaveBeenCalled();

      tick(950);
      expect(p.shown.length).toBe(1);
      tick(900 * 4);
      expect(p.shown.length).toBe(5);
      expect(p.shown.every(x => x.role === 'assistant' && x.intro)).toBeTrue();
      expect(p.shown[0].text).toContain('MyAnimaLog IA');
      expect(p.shown[2].text).toContain('adjuntar un documento');
      expect(p.shown[3].text).toContain('no reemplazo a tu veterinario');
      expect(p.typing).toBeFalse();
      expect(p.showSuggestions).toBeTrue();
      flush();
    }));

    it('la presentación no es parte del chat: no se guarda ni se manda', fakeAsync(() => {
      const p = make({ seenIntro: false });
      p.ionViewWillEnter();
      tick(900 * 5 + 100);
      expect(api.saveChat).not.toHaveBeenCalled();
      expect(p.messages).toEqual([]);
      p.draft = 'hola';
      p.send();
      expect(store[0].messages.every(x => !x.intro)).toBeTrue();
      flush();
    }));

    it('las sugerencias no salen mientras se presenta', fakeAsync(() => {
      const p = make({ seenIntro: false });
      p.ionViewWillEnter();
      tick(950);
      expect(p.showSuggestions).toBeFalse();
      flush();
    }));

    it('después solo da la bienvenida: sin presentación y con sugerencias', () => {
      const p = make({ seenIntro: true });
      p.ionViewWillEnter();
      expect(p.greeting).toBe('¡Qué bueno verte de nuevo, Luis!');
      expect(p.shown.length).toBe(0);
      expect(p.typing).toBeFalse();
      expect(p.showSuggestions).toBeTrue();
      expect(access.closeMini).toHaveBeenCalled(); // el mini chat no se queda abierto debajo
    });

    it('sin nombre, el saludo no deja una coma suelta', () => {
      const p = make({ seenIntro: true, username: '' });
      p.ionViewWillEnter();
      expect(p.greeting).toBe('¡Qué bueno verte de nuevo!');
    });

    it('si el último chat sigue abierto, lo restaura y no repite la presentación', () => {
      const p = make({ seenIntro: true, chats: [chatOf('c1', 'hola')], active: 'c1' });
      p.ionViewWillEnter();
      expect(p.chat?.id).toBe('c1');
      expect(p.messages.length).toBe(2);
      expect(p.showSuggestions).toBeFalse();
    });

    it('si no había un chat abierto, empieza uno nuevo aunque haya historial', () => {
      const p = make({ seenIntro: true, chats: [chatOf('c1', 'hola')], active: null });
      p.ionViewWillEnter();
      expect(p.chat).toBeNull();
      expect(p.messages).toEqual([]);
      expect(p.chats.length).toBe(1);
    });

    it('al salir a mitad de la presentación se cancelan los mensajes pendientes', fakeAsync(() => {
      const p = make({ seenIntro: false });
      p.ionViewWillEnter();
      tick(950);
      p.ionViewWillLeave();
      tick(10000);
      expect(p.shown.length).toBe(1);
      expect(p.typing).toBeFalse();
    }));
  });

  describe('animación de entrada', () => {
    // Algunos equipos tienen las animaciones del sistema apagadas (prefers-reduced-motion): se simula cada caso.
    const withMotion = (reduce: boolean) =>
      spyOn(window, 'matchMedia').and.callFake((q: string) => ({ matches: q.includes('reduced-motion') ? reduce : false } as MediaQueryList));

    it('con movimiento reducido en el sistema, no anima', () => {
      const animate = jasmine.createSpy('animate');
      const p = make({ seenIntro: true, host: { animate } });
      access.takeLaunchOrigin.and.returnValue({ x: 320, y: 640 });
      withMotion(true);
      p.ionViewWillEnter();
      expect(animate).not.toHaveBeenCalled();
    });

    it('si viene del botón, anima un círculo que crece desde el botón', () => {
      const animate = jasmine.createSpy('animate');
      const p = make({ seenIntro: true, host: { animate } });
      access.takeLaunchOrigin.and.returnValue({ x: 320, y: 640 });
      withMotion(false);
      p.ionViewWillEnter();
      expect(animate).toHaveBeenCalledTimes(1);
      const [frames, opts] = animate.calls.mostRecent().args;
      expect(frames[0].clipPath).toBe('circle(0px at 320px 640px)');
      expect(frames[1].clipPath).toMatch(/^circle\(\d+(\.\d+)?px at 320px 640px\)$/);
      expect(opts.duration).toBeGreaterThan(300);
    });

    it('si no viene del botón (por ejemplo, al volver), no anima', () => {
      const animate = jasmine.createSpy('animate');
      const p = make({ seenIntro: true, host: { animate } });
      p.ionViewWillEnter();
      expect(animate).not.toHaveBeenCalled();
    });
  });

  describe('enviar', () => {
    it('no se puede enviar vacío ni mientras responde', () => {
      const p = make({ seenIntro: true });
      expect(p.canSend).toBeFalse();
      p.draft = '   ';
      expect(p.canSend).toBeFalse();
      p.draft = 'hola';
      expect(p.canSend).toBeTrue();
      conv.sending = true;
      expect(p.canSend).toBeFalse();
    });

    it('manda el texto, muestra la respuesta y guarda el chat en el historial', () => {
      const p = make({ seenIntro: true });
      p.ionViewWillEnter();
      p.draft = '  ¿Cada cuánto se desparasita?  ';
      p.send();

      expect(api.send).toHaveBeenCalledWith('¿Cada cuánto se desparasita?', [], undefined, undefined);
      expect(p.messages.map(x => x.role)).toEqual(['user', 'assistant']);
      expect(p.draft).toBe('');
      expect(p.sending).toBeFalse();
      expect(store.length).toBe(1);
      expect(store[0].title).toBe('¿Cada cuánto se desparasita?');
      expect(p.chats.length).toBe(1);
    });

    it('una sugerencia con texto se envía sola; "Explícame un documento" abre el selector', () => {
      const p = make({ seenIntro: true });
      const openPicker = spyOn(p, 'openPicker');
      p.useSuggestion(p.suggestions[0]);
      expect(openPicker).toHaveBeenCalled();
      expect(api.send).not.toHaveBeenCalled();
      p.useSuggestion(p.suggestions[1]);
      expect(api.send).toHaveBeenCalled();
      expect(p.messages[0].text).toContain('mascotas');
    });

    it('Enter envía y Shift+Enter no', () => {
      const p = make({ seenIntro: true });
      p.draft = 'hola';
      const shift = { shiftKey: true, preventDefault: jasmine.createSpy() } as unknown as Event;
      p.onEnter(shift);
      expect(api.send).not.toHaveBeenCalled();
      const plain = { shiftKey: false, preventDefault: jasmine.createSpy() } as unknown as Event;
      p.onEnter(plain);
      // En computador (puntero fino) envía; en un teléfono Enter es salto de línea.
      if (matchMedia('(pointer: coarse)').matches) expect(api.send).not.toHaveBeenCalled();
      else expect(api.send).toHaveBeenCalled();
    });

    it('si falla, "Reintentar" pide otra vez la respuesta', () => {
      const p = make({ seenIntro: true });
      spyOn(console, 'error');
      api.send.and.returnValue(throwError(() => err('NETWORK')));
      p.draft = 'hola';
      p.send();
      expect(p.messages[p.messages.length - 1].error).toBeTrue();
      api.send.and.returnValue(of({ reply: 'ya sí' }));
      p.retry();
      expect(p.messages.map(x => x.text)).toEqual(['hola', 'ya sí']);
    });

    it('confirmar o cancelar una acción propuesta pasa por el servicio de conversación', () => {
      const p = make({ seenIntro: true });
      api.send.and.returnValue(of({ reply: 'Esto voy a hacer:', pendingAction: { id: 'a1', description: 'Crear mascota: Luna', status: 'PENDING' } }));
      p.draft = 'registra a Luna';
      p.send();
      const withAction = p.messages[p.messages.length - 1];
      p.confirmAction(withAction);
      expect(api.confirmAction).toHaveBeenCalledWith('a1');
      expect(p.messages.find(x => x.id === withAction.id)!.pendingAction!.status).toBe('CONFIRMED');
      expect(p.actionBusyId).toBeNull();
    });
  });

  describe('adjuntar documentos', () => {
    it('acepta PDF e imágenes, y se pueden enviar sin escribir nada', async () => {
      const p = make({ seenIntro: true });
      await p.onFilesSelected(pickEvent(file('examen.pdf', 'application/pdf'), file('foto.png', 'image/png')));
      expect(p.pending.map(x => x.file.name)).toEqual(['examen.pdf', 'foto.png']);
      expect(p.pending[0].previewUrl).toBeUndefined();
      expect(p.pending[1].previewUrl).toMatch(/^blob:/);
      expect(p.canSend).toBeTrue();

      p.send();
      expect(api.send.calls.mostRecent().args[1].map((f: File) => f.name)).toEqual(['examen.pdf', 'foto.png']);
      expect(p.messages[0].attachments!.map(a => a.name)).toEqual(['examen.pdf', 'foto.png']);
      expect(p.pending).toEqual([]);
      expect(store[0].title).toBe('Documento: examen.pdf');
      p.ngOnDestroy();
    });

    it('rechaza lo que no es PDF ni imagen y lo que pesa demasiado, y avisa', async () => {
      const p = make({ seenIntro: true });
      await p.onFilesSelected(pickEvent(file('nota.txt', 'text/plain')));
      expect(p.pending.length).toBe(0);
      expect(toast.create.calls.mostRecent().args[0].message).toContain('nota.txt');

      await p.onFilesSelected(pickEvent(file('grande.pdf', 'application/pdf', 11 * 1024 * 1024)));
      expect(p.pending.length).toBe(0);
      expect(toast.create.calls.mostRecent().args[0].message).toContain('máximo');
    });

    it('máximo 5 archivos por mensaje', async () => {
      const p = make({ seenIntro: true });
      await p.onFilesSelected(pickEvent(...Array.from({ length: 7 }, (_, i) => file(`a${i}.pdf`, 'application/pdf'))));
      expect(p.pending.length).toBe(5);
    });

    it('se puede quitar un archivo antes de enviar', async () => {
      const p = make({ seenIntro: true });
      await p.onFilesSelected(pickEvent(file('a.pdf', 'application/pdf'), file('b.pdf', 'application/pdf')));
      p.removePending(0);
      expect(p.pending.map(x => x.file.name)).toEqual(['b.pdf']);
    });
  });

  describe('barra lateral: historial de chats', () => {
    const three = () => [
      chatOf('c1', 'Vacunas de Thor', '2026-11-18T10:00:00Z'),
      chatOf('c2', 'Alimentación del gato', '2026-11-17T10:00:00Z'),
      chatOf('c3', 'Parvovirosis', '2026-10-01T10:00:00Z'),
    ];

    it('se abre y se cierra, y al abrirla trae el historial actualizado', () => {
      const p = make({ seenIntro: true, chats: three() });
      expect(p.sidebarOpen).toBeFalse();
      store.push(chatOf('c4', 'Nuevo desde otra pantalla', '2026-11-18T12:00:00Z'));
      p.openSidebar();
      expect(p.sidebarOpen).toBeTrue();
      expect(p.chats.length).toBe(4);
      p.search = 'algo';
      p.closeSidebar();
      expect(p.sidebarOpen).toBeFalse();
      expect(p.search).toBe('');
    });

    it('abrir un chat anterior carga sus mensajes y lo deja como activo', () => {
      const p = make({ seenIntro: true, chats: three() });
      p.ionViewWillEnter();
      p.openSidebar();
      p.openChat(store.find(c => c.id === 'c2')!);
      expect(p.chat?.id).toBe('c2');
      expect(p.messages[0].text).toBe('Alimentación del gato');
      expect(active).toBe('c2');
      expect(p.sidebarOpen).toBeFalse();
    });

    it('no cambia de chat mientras la IA está respondiendo', () => {
      const p = make({ seenIntro: true, chats: three() });
      conv.sending = true;
      p.openChat(store[0]);
      expect(p.chat).toBeNull();
    });

    it('"Nuevo chat" deja la pantalla limpia y el chat anterior queda en el historial', () => {
      const p = make({ seenIntro: true });
      p.draft = 'hola';
      p.send();
      p.newChat();
      expect(p.messages).toEqual([]);
      expect(p.chat).toBeNull();
      expect(active).toBeNull();
      expect(store.length).toBe(1);
      expect(p.showSuggestions).toBeTrue();
      p.draft = 'otro tema';
      p.send();
      expect(store.length).toBe(2);
    });

    it('la búsqueda filtra por título y por el contenido de los mensajes', () => {
      const p = make({ seenIntro: true, chats: three() });
      p.openSidebar();
      expect(flatChats(p.groups).length).toBe(3);
      p.search = 'vacuna';
      expect(flatChats(p.groups).map(c => c.id)).toEqual(['c1']);
      p.search = 'respuesta a parvo'; // texto de un mensaje, no del título
      expect(flatChats(p.groups).map(c => c.id)).toEqual(['c3']);
      p.search = 'no existe';
      expect(p.groups).toEqual([]);
    });

    it('los chats se agrupan por antigüedad', () => {
      const hoy = chatOf('h', 'de hoy', new Date().toISOString());
      const viejo = chatOf('v', 'viejo', new Date(2020, 0, 1).toISOString());
      const p = make({ seenIntro: true, chats: [hoy, viejo] });
      p.openSidebar();
      expect(p.groups.map(g => g.label)).toEqual(['Hoy', 'Anteriores']);
    });

    it('borrar un chat pide confirmación y lo quita del historial', async () => {
      const p = make({ seenIntro: true, chats: three() });
      p.openSidebar();
      await p.askDelete(store.find(c => c.id === 'c3')!, { stopPropagation: () => undefined } as Event);
      expect(api.deleteChat).toHaveBeenCalledWith('c3');
      expect(p.chats.map(c => c.id)).toEqual(['c1', 'c2']);
    });

    it('si se cancela, no se borra nada', async () => {
      const p = make({ seenIntro: true, chats: three() });
      p.openSidebar();
      confirmAnswer = false;
      await p.askDelete(store[0], { stopPropagation: () => undefined } as Event);
      expect(api.deleteChat).not.toHaveBeenCalled();
      expect(p.chats.length).toBe(3);
    });

    it('borrar el chat que está abierto deja un chat nuevo', async () => {
      const p = make({ seenIntro: true, chats: three(), active: 'c1' });
      p.ionViewWillEnter();
      expect(p.chat?.id).toBe('c1');
      await p.askDelete(store.find(c => c.id === 'c1')!, { stopPropagation: () => undefined } as Event);
      expect(p.chat).toBeNull();
      expect(p.messages).toEqual([]);
      expect(p.chats.map(c => c.id)).toEqual(['c2', 'c3']);
    });

    it('"Borrar todos" vacía el historial y deja un chat nuevo', async () => {
      const p = make({ seenIntro: true, chats: three(), active: 'c1' });
      p.ionViewWillEnter();
      await p.askDeleteAll();
      expect(api.deleteAllChats).toHaveBeenCalled();
      expect(p.chats).toEqual([]);
      expect(p.messages).toEqual([]);
      expect(p.chat).toBeNull();
    });

    it('el contador de mensajes no cuenta la presentación', () => {
      const p = make({ seenIntro: true });
      const c = chatOf('x', 'hola');
      c.messages.push({ ...m('assistant', 'intro'), intro: true });
      expect(p.count(c)).toBe(2);
    });
  });

  it('el botón de volver lleva al Home con la animación de volver', () => {
    const p = make({ seenIntro: true });
    p.goBack();
    expect(nav.navigateBack).toHaveBeenCalledWith(['/home']);
  });
});
