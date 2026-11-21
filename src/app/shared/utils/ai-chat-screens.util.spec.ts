import { HttpErrorResponse } from '@angular/common/http';
import { aiErrorText, describeScreen, parseAiError, suggestionsFor } from './ai-chat.util';

describe('modo seguimiento: dónde está el usuario', () => {
  it('describeScreen nombra la pantalla a partir de la URL', () => {
    expect(describeScreen('/home')).toEqual({ key: 'home', label: 'Inicio' });
    expect(describeScreen('/calendar')).toEqual({ key: 'calendar', label: 'Calendario' });
    expect(describeScreen('/calendar/add-event?type=VET_APPOINTMENT')).toEqual({ key: 'calendar', label: 'Calendario' });
    expect(describeScreen('/shared-profiles-home').label).toBe('Perfiles compartidos');
    expect(describeScreen('/vet/detail/9').label).toBe('Veterinarias');
    expect(describeScreen('/maps').label).toBe('Mapa de veterinarias');
    expect(describeScreen('/vaccine-timeline').key).toBe('vaccines');
    expect(describeScreen('/home/').label).toBe('Inicio');
  });

  it('en el perfil de una mascota incluye cuál es, para que la IA sepa de quién se habla', () => {
    expect(describeScreen('/pet-profile/abc-123')).toEqual({ key: 'pet-profile', label: 'Perfil de mascota', petId: 'abc-123' });
    expect(describeScreen('/pet-clinics/p-9').petId).toBe('p-9');
    expect(describeScreen('/pet-profile').petId).toBeUndefined();
  });

  it('una pantalla desconocida no rompe', () => {
    expect(describeScreen('/algo-nuevo').label).toBe('la app');
    expect(describeScreen('').key).toBe('home');
    expect(describeScreen('/')).toEqual({ key: 'home', label: 'la app' });
  });

  it('suggestionsFor da ideas según la pantalla (siempre algo que el IA-service sabe hacer)', () => {
    expect(suggestionsFor('pet-profile')).toContain('Registra una vacuna');
    expect(suggestionsFor('calendar')).toContain('Agéndame una cita');
    expect(suggestionsFor('vet').length).toBeGreaterThan(1);
    expect(suggestionsFor('add-pet')).toContain('Registra una mascota nueva');
    expect(suggestionsFor('desconocida').length).toBeGreaterThan(1);
    for (const key of ['home', 'pet-profile', 'calendar', 'vet', 'add-pet', 'x']) {
      expect(suggestionsFor(key).every(s => s.length > 5)).toBeTrue();
    }
  });
});

describe('errores del IA-service (códigos del backend)', () => {
  const e = (status: number, error?: any) => parseAiError(new HttpErrorResponse({ status, error }));

  it('usa el code del backend cuando viene', () => {
    expect(e(404, { code: 'CONVERSATION_NOT_FOUND' }).code).toBe('CONVERSATION_NOT_FOUND');
    expect(e(404, { code: 'PENDING_ACTION_NOT_FOUND' }).code).toBe('ACTION_NOT_FOUND');
    expect(e(415, { code: 'UNSUPPORTED_ATTACHMENT_TYPE' }).code).toBe('UNSUPPORTED');
    expect(e(400, { code: 'INVALID_REQUEST' }).code).toBe('INVALID_REQUEST');
  });

  it('un 404 sin code es la ruta que no está publicada', () => {
    expect(e(404, { message: 'No static resource' }).code).toBe('NOT_AVAILABLE');
    expect(e(404).code).toBe('NOT_AVAILABLE');
  });

  it('el code del backend gana al estado HTTP', () => {
    expect(e(404, { code: 'CONVERSATION_NOT_FOUND' }).code).not.toBe('NOT_AVAILABLE');
  });

  it('todos los códigos tienen un texto en español para el usuario', () => {
    for (const code of ['NOT_AVAILABLE', 'CONVERSATION_NOT_FOUND', 'ACTION_NOT_FOUND', 'INVALID_REQUEST', 'TOO_LARGE', 'UNSUPPORTED', 'RATE_LIMIT', 'NETWORK', 'UNKNOWN'] as const) {
      expect(aiErrorText({ code, status: 0, message: '' }).length).withContext(code).toBeGreaterThan(15);
    }
  });
});
