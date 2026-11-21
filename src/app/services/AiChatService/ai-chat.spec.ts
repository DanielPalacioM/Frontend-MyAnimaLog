import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'src/environments/environment';
import { AiChat, AiError, AiMessage } from 'src/app/models/ai-chat.model';
import { AiChatService } from './ai-chat';

const msg = (role: 'user' | 'assistant', text: string, extra: Partial<AiMessage> = {}): AiMessage => ({
  id: text, role, text, createdAt: '2026-11-18T10:00:00Z', ...extra,
});

// El contrato sale de la colección de Postman `MyAnimaLog-IA-service` (docs/coleccion de postman).
describe('AiChatService', () => {
  let service: AiChatService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/ai`;

  beforeEach(() => {
    localStorage.setItem('userId', 'u-test');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AiChatService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    environment.ai.baseUrl = '';
    ['aiChat_u-test', 'aiChats_u-test', 'aiActive_u-test', 'aiIntroSeen_u-test', 'aiChats_otro', 'aiIntroSeen_otro', 'userId'].forEach(k => localStorage.removeItem(k));
  });

  describe('POST /api/ai/chat', () => {
    it('manda message, conversationId y files como multipart', () => {
      const pdf = new File(['%PDF'], 'examen.pdf', { type: 'application/pdf' });
      const img = new File(['x'], 'foto.png', { type: 'image/png' });
      let out: any;
      service.send('Explícame esto', [pdf, img], 'c-1').subscribe(r => (out = r));

      const req = http.expectOne(`${base}/chat`);
      expect(req.request.method).toBe('POST');
      const body = req.request.body as FormData;
      expect(body instanceof FormData).toBeTrue();
      expect(body.get('message')).toBe('Explícame esto');
      expect(body.get('conversationId')).toBe('c-1');
      expect((body.getAll('files') as File[]).map(f => f.name)).toEqual(['examen.pdf', 'foto.png']);
      expect(body.has('history')).toBeFalse(); // el historial lo guarda el servidor

      req.flush({ reply: 'Es un examen de sangre.', conversationId: 'c-1', model: 'gemini' });
      expect(out.reply).toBe('Es un examen de sangre.');
      expect(out.conversationId).toBe('c-1');
      expect(out.model).toBe('gemini');
      expect(out.pendingAction).toBeNull();
    });

    it('un mensaje nuevo no manda conversationId ni archivos', () => {
      service.send('hola', [], undefined).subscribe();
      const req = http.expectOne(`${base}/chat`);
      const body = req.request.body as FormData;
      expect(body.has('conversationId')).toBeFalse();
      expect(body.has('files')).toBeFalse();
      expect(body.has('context')).toBeFalse();
      req.flush({ reply: 'ok' });
    });

    it('solo archivo (sin texto): no manda el campo message', () => {
      const img = new File(['x'], 'foto.png', { type: 'image/png' });
      service.send('', [img]).subscribe();
      const req = http.expectOne(`${base}/chat`);
      expect((req.request.body as FormData).has('message')).toBeFalse();
      req.flush({ reply: 'ok' });
    });

    it('en el modo seguimiento manda en qué pantalla está el usuario', () => {
      service.send('Agéndame una cita', [], 'c-1', { screen: 'pet-profile', label: 'Perfil de mascota', petId: 'p-9' }).subscribe();
      const req = http.expectOne(`${base}/chat`);
      expect(JSON.parse((req.request.body as FormData).get('context') as string)).toEqual({ screen: 'pet-profile', label: 'Perfil de mascota', petId: 'p-9' });
      req.flush({ reply: 'ok' });
    });

    it('lee la acción pendiente (descripcion en español) para que el usuario confirme', () => {
      let out: any;
      service.send('Registra a Luna', []).subscribe(r => (out = r));
      http.expectOne(`${base}/chat`).flush({
        reply: 'Esto es lo que voy a hacer:', conversationId: 'c-2',
        pendingAction: { id: 'act-1', descripcion: 'Crear mascota: Luna, gata de 2 años', tool: 'crear_mascota' },
      });
      expect(out.pendingAction).toEqual({ id: 'act-1', description: 'Crear mascota: Luna, gata de 2 años', status: 'PENDING' });
    });

    it('una acción pendiente sin id se ignora', () => {
      let out: any;
      service.send('x', []).subscribe(r => (out = r));
      http.expectOne(`${base}/chat`).flush({ reply: 'ok', pendingAction: { descripcion: 'sin id' } });
      expect(out.pendingAction).toBeNull();
    });

    it('acepta distintas formas de respuesta', () => {
      const replies: string[] = [];
      for (const body of [{ message: 'a' }, { answer: 'b' }, { text: 'c' }, { response: 'd' }]) {
        service.send('x', []).subscribe(r => replies.push(r.reply));
        http.expectOne(`${base}/chat`).flush(body);
      }
      expect(replies).toEqual(['a', 'b', 'c', 'd']);
    });

    it('con environment.ai.baseUrl habla directo con el IA-service', () => {
      environment.ai.baseUrl = 'https://ia-service-xxxxx.us-central1.run.app/';
      service.send('hola', []).subscribe();
      http.expectOne('https://ia-service-xxxxx.us-central1.run.app/api/ai/chat').flush({ reply: 'ok' });
    });
  });

  describe('errores del IA-service', () => {
    const fail = (status: number, body: any): AiError | undefined => {
      let err: AiError | undefined;
      service.send('x', []).subscribe({ error: e => (err = e) });
      http.expectOne(`${base}/chat`).flush(body, { status, statusText: 'x' });
      return err;
    };

    it('404 CONVERSATION_NOT_FOUND (conversación ajena o inexistente)', () => {
      expect(fail(404, { code: 'CONVERSATION_NOT_FOUND' })?.code).toBe('CONVERSATION_NOT_FOUND');
    });

    it('404 sin code (la ruta no está publicada en el gateway) = servicio no disponible', () => {
      expect(fail(404, { message: 'No static resource api/ai/chat.' })?.code).toBe('NOT_AVAILABLE');
    });

    it('400 INVALID_REQUEST, 415 UNSUPPORTED_ATTACHMENT_TYPE, 413 y sin conexión', () => {
      expect(fail(400, { code: 'INVALID_REQUEST' })?.code).toBe('INVALID_REQUEST');
      expect(fail(415, { code: 'UNSUPPORTED_ATTACHMENT_TYPE' })?.code).toBe('UNSUPPORTED');
      expect(fail(413, {})?.code).toBe('TOO_LARGE');
      let err: AiError | undefined;
      service.send('x', []).subscribe({ error: e => (err = e) });
      http.expectOne(`${base}/chat`).error(new ProgressEvent('error'));
      expect(err?.code).toBe('NETWORK');
    });
  });

  describe('acciones pendientes', () => {
    it('confirmar hace POST a /actions/{id}/confirm y devuelve el "Listo: ..."', () => {
      let out: any;
      service.confirmAction('act-1').subscribe(r => (out = r));
      const req = http.expectOne(`${base}/actions/act-1/confirm`);
      expect(req.request.method).toBe('POST');
      req.flush({ reply: 'Listo: creé a Luna.' });
      expect(out.reply).toBe('Listo: creé a Luna.');
    });

    it('rechazar hace POST a /actions/{id}/reject', () => {
      let out: any;
      service.rejectAction('act-1').subscribe(r => (out = r));
      const req = http.expectOne(`${base}/actions/act-1/reject`);
      expect(req.request.method).toBe('POST');
      req.flush({ reply: '' });
      expect(out.reply).toBe('');
    });

    it('404 PENDING_ACTION_NOT_FOUND (ya confirmada, ajena o inexistente)', () => {
      let err: AiError | undefined;
      service.confirmAction('act-1').subscribe({ error: e => (err = e) });
      http.expectOne(`${base}/actions/act-1/confirm`).flush({ code: 'PENDING_ACTION_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
      expect(err?.code).toBe('ACTION_NOT_FOUND');
    });
  });

  describe('historial de chats en el dispositivo', () => {
    const chat = (id: string, updatedAt: string, messages: AiMessage[] = [msg('user', 'hola ' + id)]): AiChat => ({
      id, title: 'hola ' + id, createdAt: updatedAt, updatedAt, messages,
    });

    it('guarda sin la presentación, sin errores y sin las miniaturas, y se puede leer de nuevo', () => {
      const withFile = msg('user', 'mira', { attachments: [{ name: 'a.png', size: 10, type: 'image/png', previewUrl: 'blob:xyz' }] });
      service.saveChat({ ...chat('c1', '2026-11-18T10:00:00Z'), conversationId: 'srv-9',
        messages: [msg('assistant', 'hola', { intro: true }), withFile, msg('assistant', 'falló', { error: true }), msg('assistant', 'visto')] });
      const loaded = service.getChat('c1')!;
      expect(loaded.conversationId).toBe('srv-9');
      expect(loaded.messages.map(m => m.text)).toEqual(['mira', 'visto']);
      expect(loaded.messages[0].attachments![0].previewUrl).toBeUndefined();
      expect(loaded.messages[0].attachments![0].name).toBe('a.png');
    });

    it('conserva la acción pendiente y su estado', () => {
      const withAction = msg('assistant', 'Confirma', { pendingAction: { id: 'a1', description: 'Crear mascota', status: 'CONFIRMED' } });
      service.saveChat({ ...chat('c1', '2026-11-18T10:00:00Z'), messages: [msg('user', 'registra'), withAction] });
      expect(service.getChat('c1')!.messages[1].pendingAction).toEqual({ id: 'a1', description: 'Crear mascota', status: 'CONFIRMED' });
    });

    it('lista del más reciente al más antiguo y actualizar un chat no lo duplica', () => {
      service.saveChat(chat('viejo', '2026-11-01T10:00:00Z'));
      service.saveChat(chat('nuevo', '2026-11-18T10:00:00Z'));
      expect(service.listChats().map(c => c.id)).toEqual(['nuevo', 'viejo']);
      service.saveChat({ ...chat('viejo', '2026-11-19T10:00:00Z'), title: 'cambió' });
      expect(service.listChats().map(c => c.id)).toEqual(['viejo', 'nuevo']);
      expect(service.getChat('viejo')!.title).toBe('cambió');
    });

    it('borra un chat; si era el activo, ya no hay chat activo', () => {
      service.saveChat(chat('a', '2026-11-18T10:00:00Z'));
      service.saveChat(chat('b', '2026-11-18T11:00:00Z'));
      service.setActiveChatId('a');
      service.deleteChat('a');
      expect(service.listChats().map(c => c.id)).toEqual(['b']);
      expect(service.getActiveChatId()).toBeNull();
      service.setActiveChatId('b');
      service.deleteChat('a'); // otro chat: el activo se conserva
      expect(service.getActiveChatId()).toBe('b');
    });

    it('borra todo el historial', () => {
      service.saveChat(chat('a', '2026-11-18T10:00:00Z'));
      service.setActiveChatId('a');
      service.deleteAllChats();
      expect(service.listChats()).toEqual([]);
      expect(service.getActiveChatId()).toBeNull();
    });

    it('cada usuario tiene su historial y su presentación', () => {
      service.saveChat(chat('del-primero', '2026-11-18T10:00:00Z'));
      service.markIntroSeen();
      expect(service.hasSeenIntro()).toBeTrue();

      localStorage.setItem('userId', 'otro');
      expect(service.listChats()).toEqual([]);
      expect(service.hasSeenIntro()).toBeFalse();
    });

    it('guarda como máximo 40 chats (se van los más viejos) y 100 mensajes por chat', () => {
      for (let i = 0; i < 45; i++) service.saveChat(chat('c' + i, new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString()));
      const all = service.listChats();
      expect(all.length).toBe(40);
      expect(all[0].id).toBe('c44');
      expect(all.some(c => c.id === 'c0')).toBeFalse();

      service.saveChat(chat('largo', '2027-01-01T00:00:00Z', Array.from({ length: 130 }, (_, i) => msg('user', 'm' + i))));
      const largo = service.getChat('largo')!;
      expect(largo.messages.length).toBe(100);
      expect(largo.messages[0].text).toBe('m30');
    });

    it('migra la conversación única de antes como el primer chat del historial', () => {
      localStorage.setItem('aiChat_u-test', JSON.stringify({ messages: [msg('user', 'pregunta vieja'), msg('assistant', 'respuesta')], conversationId: 'srv-1' }));
      const chats = service.listChats();
      expect(chats.length).toBe(1);
      expect(chats[0].title).toBe('pregunta vieja');
      expect(chats[0].conversationId).toBe('srv-1');
      expect(localStorage.getItem('aiChat_u-test')).toBeNull();
      expect(service.listChats().length).toBe(1); // no se vuelve a migrar ni se duplica
    });

    it('un JSON dañado no rompe y el chat activo se recuerda', () => {
      localStorage.setItem('aiChats_u-test', '{no es json');
      expect(service.listChats()).toEqual([]);
      service.setActiveChatId('x');
      expect(service.getActiveChatId()).toBe('x');
      service.setActiveChatId(null);
      expect(service.getActiveChatId()).toBeNull();
    });
  });
});
