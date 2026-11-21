import { NavigationEnd } from '@angular/router';
import { Subject, of } from 'rxjs';
import { AiChat } from 'src/app/models/ai-chat.model';
import { AiAccessService } from 'src/app/services/AiAccessService/ai-access';
import { AiConversationService } from 'src/app/services/AiConversationService/ai-conversation';
import { AiMiniChatComponent } from './ai-mini-chat.component';

describe('AiMiniChatComponent', () => {
  let access: AiAccessService;
  let router: { url: string; events: Subject<unknown> };
  let nav: { navigateForward: jasmine.Spy };
  let api: any;
  let store: AiChat[];
  let conv: AiConversationService;

  const make = (url = '/pet-profile/p-9') => {
    localStorage.setItem('userId', 'u-mini');
    access = new AiAccessService();
    router = { url, events: new Subject() };
    nav = { navigateForward: jasmine.createSpy('navigateForward') };
    store = [];
    api = {
      fetchConversations: () => of([]), fetchMessages: () => of([]),
      listChats: () => store,
      getActiveChatId: () => null,
      setActiveChatId: jasmine.createSpy('setActive'),
      saveChat: jasmine.createSpy('saveChat').and.callFake((c: AiChat) => { store = [c, ...store.filter(x => x.id !== c.id)]; }),
      send: jasmine.createSpy('send').and.returnValue(of({ reply: 'Claro, te ayudo.' })),
      confirmAction: jasmine.createSpy('confirmAction').and.returnValue(of({ reply: 'Listo.' })),
      rejectAction: jasmine.createSpy('rejectAction').and.returnValue(of({ reply: '' })),
    };
    conv = new AiConversationService(api);
    const c = new AiMiniChatComponent(router as any, nav as any, access, conv);
    c.ngOnInit();
    return c;
  };

  afterEach(() => localStorage.removeItem('userId'));

  it('se abre y se cierra con el estado del botón flotante, y al abrir sabe en qué pantalla está', () => {
    const c = make('/pet-profile/p-9');
    expect(c.open).toBeFalse();
    access.openMini();
    expect(c.open).toBeTrue();
    expect(c.screen).toEqual({ key: 'pet-profile', label: 'Perfil de mascota', petId: 'p-9' });
    access.closeMini();
    expect(c.open).toBeFalse();
  });

  it('lo que escribe va con la pantalla como contexto y empieza en el chat que estaba abierto', () => {
    const c = make('/pet-profile/p-9');
    access.openMini();
    c.draft = 'Registra una vacuna';
    c.send();
    expect(api.send).toHaveBeenCalledWith('Registra una vacuna', [], undefined, { screen: 'pet-profile', label: 'Perfil de mascota', petId: 'p-9' });
    expect(c.draft).toBe('');
    expect(conv.messages.map(m => m.role)).toEqual(['user', 'assistant']);
    expect(store.length).toBe(1); // queda en el historial del chat completo
  });

  it('no envía vacío ni mientras la IA responde', () => {
    const c = make();
    expect(c.canSend).toBeFalse();
    c.draft = '   ';
    expect(c.canSend).toBeFalse();
    c.draft = 'hola';
    expect(c.canSend).toBeTrue();
    conv.sending = true;
    expect(c.canSend).toBeFalse();
    c.send();
    expect(api.send).not.toHaveBeenCalled();
  });

  it('las sugerencias dependen de la pantalla y se envían con su contexto', () => {
    const c = make('/calendar');
    access.openMini();
    expect(c.suggestions).toContain('Agéndame una cita');
    c.useSuggestion('Agéndame una cita');
    expect(api.send.calls.mostRecent().args[3]).toEqual({ screen: 'calendar', label: 'Calendario', petId: undefined });
  });

  it('al cambiar de pantalla se cierra y actualiza dónde está', () => {
    const c = make('/home');
    access.openMini();
    router.events.next(new NavigationEnd(1, '/calendar', '/calendar'));
    expect(c.open).toBeFalse();
    expect(c.screen.label).toBe('Calendario');
  });

  it('"Abrir el chat completo" cierra el panel y va a /ia con la misma conversación', () => {
    const c = make();
    access.openMini();
    c.expand();
    expect(c.open).toBeFalse();
    expect(nav.navigateForward).toHaveBeenCalledWith(['/ia']);
  });

  it('confirma y cancela las acciones que propone la IA', () => {
    const c = make();
    api.send.and.returnValue(of({ reply: 'Esto voy a hacer:', pendingAction: { id: 'a1', description: 'Agendar cita', status: 'PENDING' } }));
    c.draft = 'agéndame una cita';
    c.send();
    const withAction = conv.messages[conv.messages.length - 1];
    c.confirmAction(withAction);
    expect(api.confirmAction).toHaveBeenCalledWith('a1');
    expect(conv.messages.find(m => m.id === withAction.id)!.pendingAction!.status).toBe('CONFIRMED');
  });

  it('Shift+Enter no envía', () => {
    const c = make();
    c.draft = 'hola';
    c.onEnter({ shiftKey: true, preventDefault: jasmine.createSpy() } as unknown as Event);
    expect(api.send).not.toHaveBeenCalled();
  });

  it('el texto de la IA se muestra con formato y sin HTML peligroso', () => {
    const c = make();
    expect(c.html('**hola** <script>x</script>')).toContain('<strong>hola</strong>');
    expect(c.html('<script>x</script>')).not.toContain('<script');
  });
});

