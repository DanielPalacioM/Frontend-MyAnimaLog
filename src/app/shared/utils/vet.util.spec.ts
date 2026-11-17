import { HttpErrorResponse } from '@angular/common/http';
import {
  extractVetCode, isValidVetCode, normalizeVetCode, parseVetError, petSubtitle, vetErrorText, vetInitials,
} from './vet.util';

describe('vet.util', () => {
  describe('código de clínica', () => {
    it('normaliza a mayúsculas y sin espacios', () => {
      expect(normalizeVetCode('  vet-7k2m 9qxa ')).toBe('VET-7K2M9QXA');
    });

    it('acepta VET- + 8 letras o números', () => {
      expect(isValidVetCode('VET-7K2M9QXA')).toBeTrue();
      expect(isValidVetCode('vet-4hp2zw81')).toBeTrue();
    });

    it('rechaza los otros formatos del diseño y los incompletos', () => {
      expect(isValidVetCode('PATITAS-7Q4K')).toBeFalse();
      expect(isValidVetCode('PATI-7K2Q')).toBeFalse();
      expect(isValidVetCode('VET-7K2M9QX')).toBeFalse();
      expect(isValidVetCode('VET-7K2M9QXAB')).toBeFalse();
      expect(isValidVetCode('')).toBeFalse();
    });

    it('extrae el código de un enlace de invitación o de un QR con solo el código', () => {
      expect(extractVetCode('https://app.myanimalog.com/vet/link/vet-7k2m9qxa')).toBe('VET-7K2M9QXA');
      expect(extractVetCode('VET-7K2M9QXA')).toBe('VET-7K2M9QXA');
      expect(extractVetCode('https://otro-sitio.com/')).toBeNull();
    });
  });

  it('vetInitials: iniciales sin artículos', () => {
    expect(vetInitials('Clínica Patitas')).toBe('CP');
    expect(vetInitials('Clínica Veterinaria El Bosque')).toBe('CV');
    expect(vetInitials('Centro de Mascotas')).toBe('CM');
    expect(vetInitials('')).toBe('V');
  });

  describe('parseVetError', () => {
    it('lee el code del cuerpo', () => {
      const e = parseVetError(new HttpErrorResponse({ status: 404, error: { code: 'LINK_CODE_NOT_FOUND' } }));
      expect(e.code).toBe('LINK_CODE_NOT_FOUND');
      expect(e.status).toBe(404);
    });

    it('status 0 = sin conexión', () => {
      expect(parseVetError(new HttpErrorResponse({ status: 0 })).code).toBe('NETWORK');
    });

    it('502/503/504 = servicio no disponible, aunque no traigan code', () => {
      expect(parseVetError(new HttpErrorResponse({ status: 503 })).code).toBe('EXTERNAL_SERVICE_UNAVAILABLE');
    });

    it('un code desconocido cae en UNKNOWN', () => {
      expect(parseVetError(new HttpErrorResponse({ status: 418, error: { code: 'TETERA' } })).code).toBe('UNKNOWN');
    });
  });

  it('vetErrorText: mensajes del diseño', () => {
    expect(vetErrorText({ code: 'LINK_CODE_NOT_FOUND', status: 404, message: '' }).title).toBe('Código no válido');
    expect(vetErrorText({ code: 'CLINIC_NOT_ACTIVE', status: 409, message: '' }).title).toBe('Esta clínica todavía no está disponible');
    expect(vetErrorText({ code: 'NETWORK', status: 0, message: '' }).title).toBe('No pudimos conectar');
  });

  it('petSubtitle: especie, raza y edad', () => {
    expect(petSubtitle({ species: 'Gato', breed: 'Siamés', ageMonths: 5 })).toBe('Gato · Siamés · 5 meses');
    expect(petSubtitle({ species: 'Perro', breed: 'Pastor alemán', ageMonths: 26 })).toBe('Perro · Pastor alemán · 2 años');
    expect(petSubtitle({ species: 'Perro', ageMonths: 1 })).toBe('Perro · 1 mes');
    expect(petSubtitle({ species: 'Perro', ageMonths: null })).toBe('Perro');
  });
});
