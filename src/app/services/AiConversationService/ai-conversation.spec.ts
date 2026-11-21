import { Subject, of, throwError } from 'rxjs';
import { AiChat, AiError, AiMessage } from 'src/app/models/ai-chat.model';
import { AiConversationService } from './ai-conversation';

const err = (code: AiError['code']): AiError => ({ code, status: 0, message: '' });
const m = (role: 'user' | 'assistant', text: string): AiMessage => ({ id: text, role, text, createdAt: '2026-11-18T10:00:00Z' });
const chatOf = (id: string, text: string, updatedAt = '2026-11-18T10:00:00Z'): AiChat => ({
  id, title: text, createdAt: updatedAt, updatedAt, messages: [m('user', text), m('assistant', 'respuesta a ' + text)],
});

describe('AiConversationService', () => {
  let api: any;
  let store: AiChat[];
  let active: string | null;
  let service: AiConversationService;

  const make = (chats: AiChat[] = [], activeId: string | null = null) => {
    store = chats;
    active = activeId;
    api = {
      fetchConversations: () => of([]), fetchMessages: () => of([]),
      listChats: () => [...store].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      getActiveChatId: () => active,
      setActiveChatId: jasmine.createSpy('setActive').and.callFake((id: string | null) => (active = id)),
      saveChat: jasmine.createSpy('saveChat').and.callFake((c: AiChat) => { store = [c, ...store.filter(x => x.id !== c.id)]; }),
      deleteChat: jasmine.createSpy('deleteChat').and.callFake((id: string) => { store = store.filter(c => c.id !== id); }),
      deleteAllChats: jasmine.createSpy('deleteAll').and.callFake(() => { store = []; }),
      send: jasmine.createSpy('send').and.returnValue(of({ reply: 'Respuesta de prueba' })),
      confirmAction: jasmine.createSpy('confirm').and.returnValue(of({ reply: 'Listo: creé a Luna.' })),
      rejectAction: jasmine.createSpy('reject').and.returnValue(of({ reply: '' })),
    };
    service = new AiConversationService(api);
    return service;
  };

  describe('cargar', () => {
    it('sin chat abierto empieza uno nuevo', () => {
      make([chatOf('c1', 'hola')]);
      service.loadActive();
      expect(service.chat).toBeNull();
      expect(service.messages).toEqual([]);
      expect(service.chatList.length).toBe(1);
    });

    it('continúa el chat que estaba abierto, con su conversationId', () => {
      const c = { ...chatOf('c1', 'hola'), conversationId: 'srv-1' };
      make([c], 'c1');
      service.loadActive();
      expect(service.chat?.id).toBe('c1');
      expect(service.messages.length).toBe(2);
      expect(service.conversationId).toBe('srv-1');
    });
  });

  describe('enviar', () => {
    it('manda el texto, muestra la respuesta y guarda el chat desde el primer mensaje', () => {
      make();
      service.send('  ¿Cada cuánto se desparasita?  ');
      expect(api.send).toHaveBeenCalledWith('¿Cada cuánto se desparasita?', [], undefined, undefined);
      expect(service.messages.map(x => x.role)).toEqual(['user', 'assistant']);
      expect(service.messages[1].text).toBe('Respuesta de prueba');
      expect(service.sending).toBeFalse();
      expect(service.typing).toBeFalse();
      expect(store.length).toBe(1);
      expect(store[0].title).toBe('¿Cada cuánto se desparasita?');
      expect(active).toBe(store[0].id);
      expect(service.chatList.length).toBe(1);
    });

    it('el chat queda en el historial antes de que llegue la respuesta', () => {
      make();
      api.send.and.returnValue(new Subject());
      service.send('hola');
      expect(service.sending).toBeTrue();
      expect(service.typing).toBeTrue();
      expect(store.length).toBe(1);
      expect(store[0].messages.length).toBe(1);
    });

    it('no envía vacío ni mientras responde', () => {
      make();
      service.send('   ');
      expect(api.send).not.toHaveBeenCalled();
      api.send.and.returnValue(new Subject());
      service.send('uno');
      service.send('dos');
      expect(api.send).toHaveBeenCalledTimes(1);
    });

    it('un segundo mensaje continúa el mismo chat y reenvía el conversationId', () => {
      make();
      api.send.and.returnValue(of({ reply: 'ok', conversationId: 'srv-7' }));
      service.send('uno');
      const id = store[0].id;
      service.send('dos');
      expect(store.length).toBe(1);
      expect(store[0].id).toBe(id);
      expect(store[0].conversationId).toBe('srv-7');
      expect(api.send.calls.mostRecent().args[2]).toBe('srv-7');
      expect(store[0].title).toBe('uno');
    });

    it('manda los archivos, el contexto de la pantalla y deja los adjuntos en el mensaje', () => {
      make();
      const f = new File(['x'], 'examen.pdf', { type: 'application/pdf' });
      const ctx = { screen: 'calendar', label: 'Calendario' };
      service.send('mira', [f], ctx, [{ name: 'examen.pdf', size: 1, type: 'application/pdf' }]);
      expect(api.send).toHaveBeenCalledWith('mira', [f], undefined, ctx);
      expect(service.messages[0].attachments![0].name).toBe('examen.pdf');
    });

    it('una respuesta vacía no deja un globo vacío', () => {
      make();
      api.send.and.returnValue(of({ reply: '   ' }));
      service.send('hola');
      expect(service.messages[1].text.length).toBeGreaterThan(10);
    });

    it('avisa a las pantallas cuando algo cambia (para bajar el scroll)', () => {
      make();
      let n = 0;
      service.updated$.subscribe(() => n++);
      service.send('hola');
      expect(n).toBeGreaterThan(0);
    });
  });

  describe('errores', () => {
    it('si falla, el asistente lo cuenta y el chat sigue en el historial con la pregunta', () => {
      make();
      spyOn(console, 'error');
      api.send.and.returnValue(throwError(() => err('NOT_AVAILABLE')));
      service.send('hola');
      const last = service.messages[service.messages.length - 1];
      expect(last.error).toBeTrue();
      expect(last.text).toContain('servicio de IA');
      expect(service.sending).toBeFalse();
      expect(store.length).toBe(1);
      expect(store[0].title).toBe('hola');
    });

    it('"Reintentar" vuelve a pedir la respuesta sin duplicar el mensaje del usuario', () => {
      make();
      spyOn(console, 'error');
      api.send.and.returnValue(throwError(() => err('NETWORK')));
      service.send('hola');
      expect(service.messages.length).toBe(2);

      api.send.and.returnValue(of({ reply: 'ya sí' }));
      service.retry();
      expect(api.send).toHaveBeenCalledTimes(2);
      expect(service.messages.map(x => x.text)).toEqual(['hola', 'ya sí']);
    });

    it('si la conversación guardada ya no existe en el servidor, sigue en una nueva sin avisar', () => {
      make([{ ...chatOf('c1', 'viejo'), conversationId: 'srv-muerto' }], 'c1');
      service.loadActive();
      api.send.and.returnValues(throwError(() => err('CONVERSATION_NOT_FOUND')), of({ reply: 'te leo', conversationId: 'srv-nuevo' }));
      service.send('sigo aquí');
      expect(api.send).toHaveBeenCalledTimes(2);
      expect(api.send.calls.argsFor(0)[2]).toBe('srv-muerto');
      expect(api.send.calls.argsFor(1)[2]).toBeUndefined();
      expect(service.conversationId).toBe('srv-nuevo');
      expect(service.messages.some(x => x.error)).toBeFalse();
      expect(service.messages[service.messages.length - 1].text).toBe('te leo');
    });

    it('esa recuperación se intenta una sola vez', () => {
      make([{ ...chatOf('c1', 'viejo'), conversationId: 'srv-muerto' }], 'c1');
      service.loadActive();
      spyOn(console, 'error');
      api.send.and.returnValue(throwError(() => err('CONVERSATION_NOT_FOUND')));
      service.send('sigo aquí');
      expect(api.send).toHaveBeenCalledTimes(2);
      expect(service.messages[service.messages.length - 1].error).toBeTrue();
    });
  });

  describe('acciones propuestas por la IA', () => {
    const withAction = () => {
      make();
      api.send.and.returnValue(of({ reply: 'Esto voy a hacer:', pendingAction: { id: 'act-1', description: 'Crear mascota: Luna', status: 'PENDING' } }));
      service.send('Registra a Luna');
      return service.messages[service.messages.length - 1];
    };

    it('la respuesta trae la acción pendiente y se guarda con el chat', () => {
      const a = withAction();
      expect(a.pendingAction?.id).toBe('act-1');
      expect(a.pendingAction?.status).toBe('PENDING');
      expect(store[0].messages[1].pendingAction?.id).toBe('act-1');
    });

    it('confirmar llama al servicio, marca la acción como confirmada y muestra el "Listo"', () => {
      const a = withAction();
      service.confirm(a);
      expect(api.confirmAction).toHaveBeenCalledWith('act-1');
      expect(service.messages.find(x => x.id === a.id)!.pendingAction!.status).toBe('CONFIRMED');
      expect(service.messages[service.messages.length - 1].text).toBe('Listo: creé a Luna.');
      expect(service.actionBusyId).toBeNull();
      expect(store[0].messages.find(x => x.pendingAction)!.pendingAction!.status).toBe('CONFIRMED');
    });

    it('cancelar llama a reject, marca la acción como cancelada y dice que no cambió nada', () => {
      const a = withAction();
      service.reject(a);
      expect(api.rejectAction).toHaveBeenCalledWith('act-1');
      expect(service.messages.find(x => x.id === a.id)!.pendingAction!.status).toBe('REJECTED');
      expect(service.messages[service.messages.length - 1].text).toBe('Listo, no hice ningún cambio.');
    });

    it('no se puede confirmar dos veces', () => {
      const a = withAction();
      service.confirm(a);
      service.confirm(service.messages.find(x => x.id === a.id)!);
      expect(api.confirmAction).toHaveBeenCalledTimes(1);
    });

    it('mientras una acción se procesa, no se lanza otra', () => {
      const a = withAction();
      api.confirmAction.and.returnValue(new Subject());
      service.confirm(a);
      expect(service.actionBusyId).toBe('act-1');
      service.reject(a);
      expect(api.rejectAction).not.toHaveBeenCalled();
    });

    it('si la acción ya no existe (404), queda como "no disponible" y avisa', () => {
      const a = withAction();
      spyOn(console, 'error');
      api.confirmAction.and.returnValue(throwError(() => err('ACTION_NOT_FOUND')));
      service.confirm(a);
      expect(service.messages.find(x => x.id === a.id)!.pendingAction!.status).toBe('EXPIRED');
      expect(service.messages[service.messages.length - 1].error).toBeTrue();
      expect(service.actionBusyId).toBeNull();
    });

    it('si falla por otra cosa (sin conexión), la acción sigue pendiente para reintentar', () => {
      const a = withAction();
      spyOn(console, 'error');
      api.confirmAction.and.returnValue(throwError(() => err('NETWORK')));
      service.confirm(a);
      expect(service.messages.find(x => x.id === a.id)!.pendingAction!.status).toBe('PENDING');
    });

    it('una respuesta con acción y sin texto igual muestra una frase', () => {
      make();
      api.send.and.returnValue(of({ reply: '', pendingAction: { id: 'x', description: 'Agendar cita', status: 'PENDING' } }));
      service.send('agenda');
      expect(service.messages[1].text).toContain('confirma');
    });
  });

  describe('historial', () => {
    const three = () => [chatOf('c1', 'uno', '2026-11-18T10:00:00Z'), chatOf('c2', 'dos', '2026-11-17T10:00:00Z'), chatOf('c3', 'tres', '2026-10-01T10:00:00Z')];

    it('abrir un chat anterior carga sus mensajes y lo deja como activo', () => {
      make(three());
      service.openChat(store.find(c => c.id === 'c2')!);
      expect(service.chat?.id).toBe('c2');
      expect(service.messages[0].text).toBe('dos');
      expect(active).toBe('c2');
    });

    it('no cambia de chat mientras la IA responde', () => {
      make(three());
      service.sending = true;
      service.openChat(store[0]);
      expect(service.chat).toBeNull();
    });

    it('"chat nuevo" deja todo limpio y el anterior queda en el historial', () => {
      make();
      service.send('hola');
      service.newChat();
      expect(service.messages).toEqual([]);
      expect(service.chat).toBeNull();
      expect(active).toBeNull();
      expect(store.length).toBe(1);
      service.send('otro tema');
      expect(store.length).toBe(2);
    });

    it('borrar el chat abierto deja uno nuevo; borrar otro no lo cierra', () => {
      make(three(), 'c1');
      service.loadActive();
      service.deleteChat('c3');
      expect(service.chat?.id).toBe('c1');
      expect(service.chatList.map(c => c.id)).toEqual(['c1', 'c2']);
      service.deleteChat('c1');
      expect(service.chat).toBeNull();
      expect(service.chatList.map(c => c.id)).toEqual(['c2']);
    });

    it('borrar todos vacía el historial y deja un chat nuevo', () => {
      make(three(), 'c1');
      service.loadActive();
      service.deleteAll();
      expect(api.deleteAllChats).toHaveBeenCalled();
      expect(service.chatList).toEqual([]);
      expect(service.chat).toBeNull();
    });
  });
});
