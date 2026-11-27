import { compactPhone, displayName, formatPhone, fullNameError, normalizeFullName, phoneError, userErrorMessage, USERNAME_RE } from './user-identity.util';

describe('user-identity.util · nombre completo y teléfono', () => {
  it('el nombre completo se normaliza y admite tildes, ñ, guion y apóstrofe', () => {
    expect(normalizeFullName('  Luis   Santiago  ')).toBe('Luis Santiago');
    expect(fullNameError('')).toBeNull();
    expect(fullNameError('José Peña-O\'Neil')).toBeNull();
    expect(fullNameError('A')).toContain('al menos 2');
    expect(fullNameError('Luis <script>')).toContain('solo puede');
    expect(fullNameError('x'.repeat(101))).toContain('100');
  });

  it('el username sigue sin espacios', () => {
    expect(USERNAME_RE.test('luis_santiago')).toBeTrue();
    expect(USERNAME_RE.test('Luis Santiago')).toBeFalse();
  });

  it('teléfono: opcional, acepta formatos comunes y rechaza lo que no es número', () => {
    expect(phoneError('')).toBeNull();
    expect(phoneError('3001234567')).toBeNull();
    expect(phoneError('+57 300 123 4567')).toBeNull();
    expect(phoneError('(300) 123-4567')).toBeNull();
    expect(phoneError('not-a-phone')).not.toBeNull();
    expect(phoneError('12345')).not.toBeNull();
    expect(phoneError('57+3001234567')).not.toBeNull();
    expect(compactPhone('+57 300 123 4567')).toBe('+573001234567');
    expect(formatPhone('+573001234567')).toBe('+57 300 123 4567');
  });

  it('traduce los errores del backend', () => {
    expect(userErrorMessage({ status: 400, error: { code: 'INVALID_PHONE' } })).toBe('El número de teléfono no es válido.');
    expect(userErrorMessage({ status: 409, error: {} })).toContain('ya está en uso');
    expect(userErrorMessage({ status: 400, error: { field_errors: { fullName: 'x' } } })).toContain('nombre completo');
    expect(userErrorMessage({ status: 500 }, 'falló')).toBe('falló');
  });

  it('nombre para mostrar: fullName o, si no hay, el username', () => {
    expect(displayName({ fullName: 'Luis Santiago', username: 'luis_s' })).toBe('Luis Santiago');
    expect(displayName({ fullName: null, username: 'luis_s' })).toBe('luis_s');
  });
});
