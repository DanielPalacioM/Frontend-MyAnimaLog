import { calendarBaseUrl } from './calendar-url.util';

describe('calendarBaseUrl', () => {
  const prod = { apiUrl: 'https://gw/api', calendarUrl: 'https://cal/api', calendarWebPath: '/api' };

  it('en la web desplegada usa el mismo dominio (Hosting reenvía a Calendar)', () => {
    expect(calendarBaseUrl(prod, false)).toBe('/api');
  });

  it('en el celular va directo a Calendar', () => {
    expect(calendarBaseUrl(prod, true)).toBe('https://cal/api');
  });

  it('en local usa el proxy y, sin Calendar, el gateway', () => {
    expect(calendarBaseUrl({ apiUrl: 'https://gw/api', calendarUrl: '/calendar-api' }, false)).toBe('/calendar-api');
    expect(calendarBaseUrl({ apiUrl: 'https://gw/api' }, false)).toBe('https://gw/api');
  });
});
