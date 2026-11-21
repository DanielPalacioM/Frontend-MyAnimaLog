import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AiChat } from 'src/app/models/ai-chat.model';
import { AiChatService } from 'src/app/services/AiChatService/ai-chat';
import { AiConversationService } from './ai-conversation';

// Respuestas reales del IA-service (GET /api/ai/conversations y .../messages), cuenta de prueba.
const SERVER_LIST = [
  { id: 'c-new', titulo: '¿Cuáles son mis mascotas?', updatedAt: '2026-11-20T22:00:28.586089Z' },
  { id: 'c-old', titulo: 'Registra la vacuna de moquillo de Thor', updatedAt: '2026-10-01T20:51:32.094234Z' },
];
const SERVER_MESSAGES = [
  { id: 'm1', rol: 'user', contenido: '¿Cuáles son mis mascotas?', adjuntos: [], createdAt: '2026-11-20T22:00:28Z' },
  { id: 'm2', rol: 'tool', adjuntos: [], createdAt: '2026-11-20T22:00:45Z' },
  { id: 'm3', rol: 'model', contenido: 'Tienes dos mascotas: **Luna** y **Thor**.', adjuntos: [], createdAt: '2026-11-20T22:00:50Z' },
];

describe('AiChatService · historial del servidor', () => {
  let service: AiChatService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/ai`;

  beforeEach(() => {
    localStorage.setItem('userId', 'u-srv');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AiChatService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.removeItem('userId'); });

  it('trae las conversaciones del usuario como chats que solo están en el servidor', () => {
    let out: AiChat[] = [];
    service.fetchConversations().subscribe(r => (out = r));
    const req = http.expectOne(r => r.url === `${base}/conversations`);
    expect(req.request.params.get('limit')).toBe('50');
    req.flush(SERVER_LIST);
    expect(out.length).toBe(2);
    expect(out[0]).toEqual(jasmine.objectContaining({ id: 'srv-c-new', title: '¿Cuáles son mis mascotas?', conversationId: 'c-new', remote: true, messages: [] }));
  });

  it('trae los mensajes: "user" y "model", sin los internos de rol "tool"', () => {
    let out: any[] = [];
    service.fetchMessages('c-new').subscribe(r => (out = r));
    http.expectOne(r => r.url === `${base}/conversations/c-new/messages`).flush(SERVER_MESSAGES);
    expect(out.map(m => m.role)).toEqual(['user', 'assistant']);
    expect(out[1].text).toContain('Luna');
  });
});

describe('AiConversationService · historial del servidor', () => {
  let api: any;
  let store: AiChat[];
  let service: AiConversationService;
  const remote = (id: string, updatedAt: string): AiChat => ({ id: 'srv-' + id, title: 't-' + id, createdAt: updatedAt, updatedAt, conversationId: id, messages: [], remote: true });

  beforeEach(() => {
    localStorage.setItem('userId', 'u-srv');
    store = [];
    api = {
      fetchConversations: jasmine.createSpy('fetchConversations').and.returnValue(of([remote('c-new', '2026-11-20T22:00:00Z'), remote('c-old', '2026-10-01T20:00:00Z')])),
      fetchMessages: jasmine.createSpy('fetchMessages').and.returnValue(of([{ id: 'm1', role: 'user', text: 'hola', createdAt: '2026-11-20T22:00:00Z' }])),
      listChats: () => [...store],
      getActiveChatId: () => null,
      setActiveChatId: () => {},
      saveChat: (c: AiChat) => { store = [c, ...store.filter(x => x.id !== c.id)]; },
      deleteChat: (id: string) => { store = store.filter(c => c.id !== id); },
      deleteAllChats: () => { store = []; },
      send: jasmine.createSpy('send').and.returnValue(of({ reply: 'ok', conversationId: 'c-new' })),
      confirmAction: () => of({ reply: '' }),
      rejectAction: () => of({ reply: '' }),
    };
    service = new AiConversationService(api);
  });
  afterEach(() => localStorage.removeItem('userId'));

  it('al abrir muestra los chats del servidor además de los del dispositivo, del más reciente al más antiguo', () => {
    store = [{ id: 'local-1', title: 'local', createdAt: '2026-11-19T10:00:00Z', updatedAt: '2026-11-19T10:00:00Z', messages: [{ id: 'a', role: 'user', text: 'x', createdAt: '' }] }];
    service.loadActive();
    expect(service.chatList.map(c => c.id)).toEqual(['srv-c-new', 'local-1', 'srv-c-old']);
  });

  it('un chat que ya está en el dispositivo no se repite aunque también esté en el servidor', () => {
    store = [{ id: 'local-1', title: 'local', createdAt: '2026-11-20T22:00:00Z', updatedAt: '2026-11-20T23:00:00Z', conversationId: 'c-new', messages: [{ id: 'a', role: 'user', text: 'x', createdAt: '' }] }];
    service.loadActive();
    expect(service.chatList.map(c => c.id)).toEqual(['local-1', 'srv-c-old']);
  });

  it('abrir un chat del servidor trae sus mensajes y sigue la misma conversación', () => {
    service.loadActive();
    service.openChat(service.chatList.find(c => c.id === 'srv-c-old')!);
    expect(api.fetchMessages).toHaveBeenCalledWith('c-old');
    expect(service.messages.map(m => m.text)).toEqual(['hola']);
    expect(service.conversationId).toBe('c-old');
    expect(service.remoteLoading).toBeFalse();
    service.send('otra pregunta');
    expect(api.send.calls.mostRecent().args[2]).toBe('c-old');
  });

  it('si no se pueden traer los mensajes lo avisa y no se queda cargando', () => {
    api.fetchMessages.and.returnValue(throwError(() => ({ code: 'NOT_AVAILABLE', status: 503, message: '' })));
    service.loadActive();
    service.openChat(service.chatList[0]);
    expect(service.remoteLoading).toBeFalse();
    expect(service.messages[service.messages.length - 1].error).toBeTrue();
  });

  it('si el servidor no responde se sigue con el historial del dispositivo', () => {
    api.fetchConversations.and.returnValue(throwError(() => ({ code: 'NOT_AVAILABLE', status: 503, message: '' })));
    store = [{ id: 'local-1', title: 'local', createdAt: '2026-11-19T10:00:00Z', updatedAt: '2026-11-19T10:00:00Z', messages: [{ id: 'a', role: 'user', text: 'x', createdAt: '' }] }];
    service.loadActive();
    expect(service.chatList.map(c => c.id)).toEqual(['local-1']);
  });

  it('al entrar otra cuenta no queda ningún chat del servidor de la anterior', () => {
    service.loadActive();
    expect(service.chatList.length).toBe(2);
    api.fetchConversations.and.returnValue(of([]));
    localStorage.setItem('userId', 'u-otra');
    service.loadActive();
    expect(service.chatList).toEqual([]);
  });
});
