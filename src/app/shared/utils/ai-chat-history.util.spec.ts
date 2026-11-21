import { chatTitle, chatWhen, groupChats, normalizeSearch, searchChats } from './ai-chat.util';

describe('historial de chats (ai-chat.util)', () => {
  const user = (text: string, attachments?: { name: string }[]) => ({ role: 'user', text, attachments });

  it('chatTitle: primer mensaje del usuario, recortado', () => {
    expect(chatTitle([user('¿Cada cuánto desparasito a mi perro?')])).toBe('¿Cada cuánto desparasito a mi perro?');
    const largo = chatTitle([user('a'.repeat(80))]);
    expect(largo.length).toBe(42);
    expect(largo.endsWith('…')).toBeTrue();
    expect(chatTitle([user('  varias   líneas \n juntas ')])).toBe('varias líneas juntas');
  });

  it('chatTitle: sin texto usa el archivo; sin nada, "Nuevo chat"', () => {
    expect(chatTitle([user('', [{ name: 'examen.pdf' }])])).toBe('Documento: examen.pdf');
    expect(chatTitle([])).toBe('Nuevo chat');
    expect(chatTitle([{ role: 'assistant', text: 'hola' }])).toBe('Nuevo chat');
  });

  it('normalizeSearch ignora tildes y mayúsculas', () => {
    expect(normalizeSearch('  DesparasitaCIÓN ')).toBe('desparasitacion');
  });

  it('searchChats busca en el título y en el texto de los mensajes, sin tildes', () => {
    const chats = [
      { title: 'Vacunas de Thor', messages: [{ text: 'hola' }] },
      { title: 'Dudas', messages: [{ text: '¿Qué es la parvovirosis?' }] },
      { title: 'Otra cosa', messages: [{ text: 'nada' }] },
    ];
    expect(searchChats(chats, '').length).toBe(3);
    expect(searchChats(chats, '   ').length).toBe(3);
    expect(searchChats(chats, 'VACUNA').map(c => c.title)).toEqual(['Vacunas de Thor']);
    expect(searchChats(chats, 'parvovirosis').map(c => c.title)).toEqual(['Dudas']);
    expect(searchChats(chats, 'que es').map(c => c.title)).toEqual(['Dudas']);
    expect(searchChats(chats, 'zzz')).toEqual([]);
  });

  it('groupChats agrupa por antigüedad y conserva el orden', () => {
    const now = new Date(2026, 10, 18, 15, 0); // 18 nov 2026, 3 pm
    const at = (d: number, h = 9) => new Date(2026, 10, d, h).toISOString();
    const chats = [
      { id: 'hoy2', updatedAt: at(18, 14) }, { id: 'hoy1', updatedAt: at(18, 8) }, { id: 'ayer', updatedAt: at(17) },
      { id: 'hace5', updatedAt: at(13) }, { id: 'hace8', updatedAt: at(10) }, { id: 'viejo', updatedAt: new Date(2026, 8, 1).toISOString() },
    ];
    const groups = groupChats(chats, now);
    expect(groups.map(g => g.label)).toEqual(['Hoy', 'Ayer', 'Últimos 7 días', 'Anteriores']);
    expect(groups[0].chats.map(c => c.id)).toEqual(['hoy2', 'hoy1']);
    expect(groups[1].chats.map(c => c.id)).toEqual(['ayer']);
    expect(groups[2].chats.map(c => c.id)).toEqual(['hace5']);
    expect(groups[3].chats.map(c => c.id)).toEqual(['hace8', 'viejo']);
  });

  it('groupChats omite los grupos vacíos', () => {
    expect(groupChats([], new Date())).toEqual([]);
    const now = new Date(2026, 10, 18, 15, 0);
    expect(groupChats([{ updatedAt: new Date(2026, 10, 18, 9).toISOString() }], now).map(g => g.label)).toEqual(['Hoy']);
  });

  it('chatWhen: hora si es de hoy, fecha corta si no', () => {
    const now = new Date(2026, 10, 18, 15, 0);
    expect(chatWhen(new Date(2026, 10, 18, 9, 5).toISOString(), now)).toMatch(/9:05/);
    expect(chatWhen(new Date(2026, 10, 3, 9, 5).toISOString(), now)).toMatch(/3 nov/);
    expect(chatWhen('no es fecha', now)).toBe('');
  });
});
