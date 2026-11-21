import { HttpErrorResponse } from '@angular/common/http';
import {
  AI_MAX_BYTES, AI_MAX_FILES, aiErrorText, formatAiText, formatFileSize, parseAiError, validateAttachment,
} from './ai-chat.util';

describe('ai-chat.util', () => {
  describe('formatAiText', () => {
    it('escapa el HTML: no se puede inyectar nada', () => {
      const html = formatAiText('<script>alert(1)</script> <img src=x onerror=alert(2)> "hola" & \'chao\'');
      expect(html).not.toContain('<script');
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&amp;');
    });

    it('párrafos, saltos de línea y negrita', () => {
      expect(formatAiText('Hola **Max**\nsegunda línea\n\nOtro párrafo')).toBe('<p>Hola <strong>Max</strong><br>segunda línea</p><p>Otro párrafo</p>');
    });

    it('listas con viñetas y numeradas', () => {
      expect(formatAiText('- uno\n- dos')).toBe('<ul><li>uno</li><li>dos</li></ul>');
      expect(formatAiText('1. primero\n2) segundo')).toBe('<ol><li>primero</li><li>segundo</li></ol>');
      expect(formatAiText('Pasos:\n* a\n* b\n\nFin')).toBe('<p>Pasos:</p><ul><li>a</li><li>b</li></ul><p>Fin</p>');
    });

    it('títulos en negrita y código en línea', () => {
      expect(formatAiText('## Cuidados')).toBe('<p><strong>Cuidados</strong></p>');
      expect(formatAiText('Usa `amoxicilina`')).toBe('<p>Usa <code>amoxicilina</code></p>');
    });

    it('texto vacío o nulo no rompe', () => {
      expect(formatAiText('')).toBe('');
      expect(formatAiText(null as any)).toBe('');
    });
  });

  describe('validateAttachment', () => {
    const f = (type: string, size = 1000, name = 'a') => ({ name, type, size });

    it('acepta PDF e imágenes', () => {
      expect(validateAttachment(f('application/pdf'), 0)).toBeNull();
      expect(validateAttachment(f('image/jpeg'), 0)).toBeNull();
      expect(validateAttachment(f('image/png'), 0)).toBeNull();
      expect(validateAttachment(f('image/webp'), 0)).toBeNull();
    });

    it('rechaza otros tipos, archivos vacíos y demasiado pesados', () => {
      expect(validateAttachment(f('text/plain', 10, 'nota.txt'), 0)).toContain('nota.txt');
      expect(validateAttachment(f('application/zip'), 0)).not.toBeNull();
      expect(validateAttachment(f('application/pdf', 0), 0)).toContain('vacío');
      expect(validateAttachment(f('application/pdf', AI_MAX_BYTES + 1), 0)).toContain('máximo');
    });

    it('límite de archivos por mensaje', () => {
      expect(validateAttachment(f('application/pdf'), AI_MAX_FILES)).toContain(`${AI_MAX_FILES}`);
      expect(validateAttachment(f('application/pdf'), AI_MAX_FILES - 1)).toBeNull();
    });
  });

  it('formatFileSize', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  describe('parseAiError', () => {
    it('mapea el estado HTTP al código', () => {
      expect(parseAiError(new HttpErrorResponse({ status: 0 })).code).toBe('NETWORK');
      expect(parseAiError(new HttpErrorResponse({ status: 404 })).code).toBe('NOT_AVAILABLE');
      expect(parseAiError(new HttpErrorResponse({ status: 503 })).code).toBe('NOT_AVAILABLE');
      expect(parseAiError(new HttpErrorResponse({ status: 413 })).code).toBe('TOO_LARGE');
      expect(parseAiError(new HttpErrorResponse({ status: 415 })).code).toBe('UNSUPPORTED');
      expect(parseAiError(new HttpErrorResponse({ status: 429 })).code).toBe('RATE_LIMIT');
      expect(parseAiError(new HttpErrorResponse({ status: 500 })).code).toBe('UNKNOWN');
    });

    it('cada código tiene un texto para el usuario', () => {
      for (const code of ['NOT_AVAILABLE', 'TOO_LARGE', 'UNSUPPORTED', 'RATE_LIMIT', 'NETWORK', 'UNKNOWN'] as const) {
        expect(aiErrorText({ code, status: 0, message: '' }).length).toBeGreaterThan(10);
      }
    });
  });
});
