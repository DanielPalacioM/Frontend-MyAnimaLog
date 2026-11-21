import { Subject, of } from 'rxjs';
import { AiChat } from 'src/app/models/ai-chat.model';
import { AiConversationService } from './ai-conversation';

// Cada cuenta tiene su propio historial: lo que escribió una no debe verse ni guardarse en la otra.
describe('AiConversationService · cambio de cuenta', () => {
  let stores: Record<string, AiChat[]>;
  let actives: Record<string, string | null>;
  let api: any;
  let service: AiConversationService;
  const uid = () => localStorage.getItem('userId') || '';

  beforeEach(() => {
    stores = { 'u-a': [], 'u-b': [] };
    actives = { 'u-a': null, 'u-b': null };
    api = {
      // Como el servicio real: todo se guarda con la clave del usuario que está logueado.
      fetchConversations: () => of([]), fetchMessages: () => of([]),
      listChats: () => [...(stores[uid()] ?? [])],
      getActiveChatId: () => actives[uid()] ?? null,
      setActiveChatId: (id: string | null) => (actives[uid()] = id),
      saveChat: jasmine.createSpy('saveChat').and.callFake((c: AiChat) => { stores[uid()] = [c, ...(stores[uid()] ?? []).filter(x => x.id !== c.id)]; }),
      deleteChat: () => {},
      deleteAllChats: () => {},
      send: jasmine.createSpy('send').and.returnValue(of({ reply: 'respuesta', conversationId: 'srv-a' })),
      confirmAction: () => of({ reply: '' }),
      rejectAction: () => of({ reply: '' }),
    };
    localStorage.setItem('userId', 'u-a');
    service = new AiConversationService(api);
  });

  afterEach(() => localStorage.removeItem('userId'));

  it('al entrar otra cuenta no se ve el chat de la anterior y empieza sin conversación del servidor', () => {
    service.loadActive();
    service.send('hola, soy A');
    expect(service.messages.length).toBe(2);
    expect(service.conversationId).toBe('srv-a');

    localStorage.setItem('userId', 'u-b');
    service.loadActive();
    expect(service.chat).toBeNull();
    expect(service.messages).toEqual([]);
    expect(service.conversationId).toBeUndefined();
    expect(service.chatList).toEqual([]);
  });

  it('lo que escribe la segunda cuenta se guarda solo en la suya', () => {
    service.loadActive();
    service.send('hola, soy A');
    localStorage.setItem('userId', 'u-b');
    service.send('hola, soy B'); // sin pasar por loadActive: igual se limpia lo de A
    expect(api.send.calls.mostRecent().args[2]).toBeUndefined(); // no reusa la conversación de A
    expect(stores['u-b'].length).toBe(1);
    expect(stores['u-b'][0].messages.map(m => m.text)).not.toContain('hola, soy A');
    expect(stores['u-a'].length).toBe(1);
    expect(stores['u-a'][0].messages.map(m => m.text)).toContain('hola, soy A');
  });

  it('al volver la primera cuenta recupera su propio historial', () => {
    service.loadActive();
    service.send('hola, soy A');
    localStorage.setItem('userId', 'u-b');
    service.loadActive();
    localStorage.setItem('userId', 'u-a');
    service.loadActive();
    expect(service.chatList.length).toBe(1);
    expect(service.chatList[0].messages[0].text).toBe('hola, soy A');
  });

  it('una respuesta que llega cuando ya entró otra cuenta no se muestra ni se guarda', () => {
    const reply$ = new Subject<any>();
    api.send.and.returnValue(reply$);
    service.loadActive();
    service.send('pregunta de A');
    localStorage.setItem('userId', 'u-b');
    service.loadActive();
    reply$.next({ reply: 'respuesta tardía para A', conversationId: 'srv-a' });
    expect(service.messages).toEqual([]);
    expect(stores['u-b']).toEqual([]);
  });
});
