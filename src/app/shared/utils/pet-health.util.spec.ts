import {
  addDays,
  ageMonthsAt,
  allergyOrigin,
  daysUntil,
  dueText,
  healthErrorText,
  healthDate,
  isActiveAllergy,
  isoDate,
  neuteredLabel,
  neuteredOrigin,
  normalizeAllergies,
  normalizeAllergy,
  normalizeDewormings,
  normalizeNeutered,
  normalizeSummary,
  parseHealthError,
  preventionLabel,
  stateFromDate,
  suggestNextDose,
  withSuggestedNext,
} from './pet-health.util';

const TODAY = '2026-11-20';

describe('pet-health.util', () => {
  describe('fechas', () => {
    it('suma días cruzando mes y año, sin saltos por cambio de hora', () => {
      expect(addDays('2026-11-20', 14)).toBe('2026-12-04');
      expect(addDays('2026-12-25', 10)).toBe('2027-01-04');
      expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
      expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    });

    it('cuenta los días hasta una fecha (negativo si ya pasó)', () => {
      expect(daysUntil('2026-11-25', TODAY)).toBe(5);
      expect(daysUntil('2026-11-20', TODAY)).toBe(0);
      expect(daysUntil('2026-11-10', TODAY)).toBe(-10);
    });

    it('isoDate recorta una fecha con hora y descarta lo que no es fecha', () => {
      expect(isoDate('2026-10-01T05:00:00.000Z')).toBe('2026-10-01');
      expect(isoDate('ayer')).toBe('');
      expect(isoDate(null)).toBe('');
    });

    it('formatea la fecha visible en español', () => {
      expect(healthDate('2026-10-01')).toContain('2026');
      expect(healthDate('')).toBe('');
    });

    it('calcula la edad en meses completos', () => {
      expect(ageMonthsAt('2026-10-01', '2026-11-01')).toBe(1);
      expect(ageMonthsAt('2026-10-15', '2026-11-14')).toBe(0);
      expect(ageMonthsAt('2022-01-15', '2026-11-20')).toBe(58);
      expect(ageMonthsAt('', '2026-11-20')).toBe(0);
    });
  });

  describe('estado del ciclo', () => {
    it('vencida si ya pasó, por vencer hasta 7 días y al día después', () => {
      expect(stateFromDate('2026-11-19', TODAY)).toBe('OVERDUE');
      expect(stateFromDate('2026-11-20', TODAY)).toBe('DUE_SOON');
      expect(stateFromDate('2026-11-27', TODAY)).toBe('DUE_SOON');
      expect(stateFromDate('2026-11-28', TODAY)).toBe('OK');
    });

    it('dice cuánto falta o cuánto pasó', () => {
      expect(dueText('2026-11-20', TODAY)).toBe('hoy');
      expect(dueText('2026-11-21', TODAY)).toBe('mañana');
      expect(dueText('2026-11-19', TODAY)).toBe('ayer');
      expect(dueText('2026-12-02', TODAY)).toBe('en 12 días');
      expect(dueText('2026-11-10', TODAY)).toBe('hace 10 días');
      expect(dueText('', TODAY)).toBe('');
    });

    it('los textos de estado son los de las vacunas', () => {
      expect(['OK', 'DUE_SOON', 'OVERDUE', 'NONE'].map(s => preventionLabel(s as any))).toEqual(['Al día', 'Por vencer', 'Vencida', 'Sin registro']);
    });
  });

  describe('próxima dosis sugerida según la edad', () => {
    it('cachorro de menos de 3 meses: interna cada 2 semanas', () => {
      expect(suggestNextDose('INTERNAL', '2026-10-01', '2026-11-01')).toBe('2026-11-15');
    });
    it('de 3 a 6 meses: mensual', () => {
      expect(suggestNextDose('INTERNAL', '2026-07-01', '2026-11-01')).toBe('2026-12-01');
    });
    it('adulto: interna cada 3 meses', () => {
      expect(suggestNextDose('INTERNAL', '2022-01-15', '2026-10-01')).toBe('2026-12-30');
    });
    it('externa: mensual, a cualquier edad', () => {
      expect(suggestNextDose('EXTERNAL', '2026-10-01', '2026-11-01')).toBe('2026-12-01');
      expect(suggestNextDose('EXTERNAL', '2022-01-15', '2026-11-01')).toBe('2026-12-01');
    });
    it('sin fecha de nacimiento se trata como adulto; sin fecha de aplicación no propone nada', () => {
      expect(suggestNextDose('INTERNAL', '', '2026-10-01')).toBe('2026-12-30');
      expect(suggestNextDose('INTERNAL', '2022-01-15', '')).toBe('');
    });
  });

  describe('normalizeDewormings', () => {
    it('lee la respuesta de la colección: la última dosis por tipo', () => {
      const o = normalizeDewormings({
        dewormings: {
          INTERNAL: { registered: true, lastApplicationDate: '2026-10-01', nextDoseDate: '2026-12-30' },
          EXTERNAL: { registered: false, lastApplicationDate: null },
        },
      }, TODAY);
      expect(o.INTERNAL.registered).toBeTrue();
      expect(o.INTERNAL.lastApplicationDate).toBe('2026-10-01');
      expect(o.INTERNAL.state).toBe('OK');
      expect(o.EXTERNAL.registered).toBeFalse();
      expect(o.EXTERNAL.state).toBe('NONE');
      expect(o.history).toEqual([]);
    });

    it('una próxima dosis pasada la deja vencida', () => {
      const o = normalizeDewormings({ dewormings: { INTERNAL: { registered: true, lastApplicationDate: '2026-08-01', nextDoseDate: '2026-11-01' } } }, TODAY);
      expect(o.INTERNAL.state).toBe('OVERDUE');
    });

    it('acepta la respuesta envuelta en { success, data }', () => {
      const o = normalizeDewormings({ success: true, data: { dewormings: { EXTERNAL: { registered: true, lastApplicationDate: '2026-11-01' } } } }, TODAY);
      expect(o.EXTERNAL.registered).toBeTrue();
      expect(o.INTERNAL.registered).toBeFalse();
    });

    it('con una lista plana de dosis arma la última de cada tipo y el historial, sin contar las anuladas', () => {
      const o = normalizeDewormings([
        { id: 'a', kind: 'INTERNAL', product: 'Drontal', applicationDate: '2026-08-01', nextDoseDate: '2026-10-30', status: 'ACTIVE' },
        { id: 'b', kind: 'INTERNAL', product: 'Milbemax', applicationDate: '2026-11-10', status: 'ENTERED_IN_ERROR' },
        { id: 'c', kind: 'EXTERNAL', product: 'Frontline', applicationDate: '2026-11-01', administeredBy: 'CLINIC', veterinaryName: 'Clínica Patitas' },
      ], TODAY);
      expect(o.history.length).toBe(3);
      expect(o.history[0].id).toBe('b');
      expect(o.INTERNAL.last?.id).toBe('a');
      expect(o.INTERNAL.state).toBe('OVERDUE');
      expect(o.EXTERNAL.last?.administeredBy).toBe('CLINIC');
      expect(o.EXTERNAL.last?.veterinaryName).toBe('Clínica Patitas');
    });

    it('con una respuesta vacía o rara no falla: todo queda sin registro', () => {
      for (const res of [null, undefined, {}, 'x', []]) {
        const o = normalizeDewormings(res, TODAY);
        expect(o.INTERNAL.state).toBe('NONE');
        expect(o.EXTERNAL.state).toBe('NONE');
      }
    });

    it('usa el estado que dice el servidor cuando no hay próxima dosis', () => {
      const o = normalizeDewormings({ dewormings: { INTERNAL: { registered: true, lastApplicationDate: '2026-10-01', status: 'OVERDUE' } } }, TODAY);
      expect(o.INTERNAL.state).toBe('OVERDUE');
    });
  });

  describe('withSuggestedNext', () => {
    const base = normalizeDewormings({ dewormings: { INTERNAL: { registered: true, lastApplicationDate: '2026-11-01' }, EXTERNAL: { registered: false } } }, TODAY);

    it('propone la próxima dosis, la marca como sugerida y recalcula el estado', () => {
      const s = withSuggestedNext({ ...base.INTERNAL, lastApplicationDate: '2026-11-15' }, '2026-10-01', TODAY);
      expect(s.nextDoseDate).toBe('2026-11-29'); // cachorro de 1 mes: cada 2 semanas
      expect(s.nextSuggested).toBeTrue();
      expect(s.state).toBe('OK');
      const missed = withSuggestedNext(base.INTERNAL, '2026-10-01', TODAY); // aplicada el 1 nov → tocaba el 15
      expect(missed.state).toBe('OVERDUE');
      const late = withSuggestedNext({ ...base.INTERNAL, lastApplicationDate: '2026-08-01' }, '2022-01-15', TODAY);
      expect(late.nextDoseDate).toBe('2026-10-30');
      expect(late.state).toBe('OVERDUE');
    });

    it('no pisa la fecha del backend ni inventa una para un tipo sin registro', () => {
      const given = { ...base.INTERNAL, nextDoseDate: '2027-01-01' };
      expect(withSuggestedNext(given, '2022-01-15', TODAY)).toBe(given);
      expect(withSuggestedNext(base.EXTERNAL, '2022-01-15', TODAY)).toBe(base.EXTERNAL);
    });
  });

  describe('alergias', () => {
    it('lee la respuesta de la colección y ordena primero las graves', () => {
      const o = normalizeAllergies({
        allergyStatus: 'HAS_ALLERGIES',
        allergies: [
          { id: '1', allergen: 'Pollo', category: 'FOOD', severity: 'MILD', status: 'CONFIRMED', source: 'CLINIC' },
          { id: '2', allergen: 'Penicilina', category: 'DRUG', severity: 'SEVERE', reaction: 'Urticaria', status: 'SUSPECTED', source: 'OWNER' },
        ],
      });
      expect(o.allergyStatus).toBe('HAS_ALLERGIES');
      expect(o.allergies.map(a => a.allergen)).toEqual(['Penicilina', 'Pollo']);
      expect(o.allergies[0].state).toBe('SUSPECTED');
      expect(o.allergies[0].reaction).toBe('Urticaria');
    });

    it('"No sé" no es "no tiene": sin estado ni alergias queda sin preguntar', () => {
      expect(normalizeAllergies({ allergies: [] }).allergyStatus).toBe('UNKNOWN');
      expect(normalizeAllergies({ allergyStatus: 'NONE_KNOWN', allergies: [] }).allergyStatus).toBe('NONE_KNOWN');
      expect(normalizeAllergies(null).allergyStatus).toBe('UNKNOWN');
    });

    it('sin estado pero con una alergia vigente deduce que tiene alergias; una anulada no cuenta', () => {
      expect(normalizeAllergies({ allergies: [{ allergen: 'X', status: 'SUSPECTED' }] }).allergyStatus).toBe('HAS_ALLERGIES');
      expect(normalizeAllergies({ allergies: [{ allergen: 'X', status: 'ENTERED_IN_ERROR' }] }).allergyStatus).toBe('UNKNOWN');
    });

    it('acepta alérgenos como texto y valores desconocidos con valores seguros', () => {
      const a = normalizeAllergy('Polen');
      expect(a.allergen).toBe('Polen');
      const b = normalizeAllergy({ allergen: 'Algo', category: 'RARA', severity: '???', status: 'rara' });
      expect(b.category).toBe('OTHER');
      expect(b.severity).toBe('MILD');
      expect(b.state).toBe('SUSPECTED');
    });

    it('vigente = declarada o confirmada', () => {
      expect(['SUSPECTED', 'CONFIRMED', 'RESOLVED', 'ENTERED_IN_ERROR'].map(s => isActiveAllergy(normalizeAllergy({ allergen: 'x', status: s })))).toEqual([true, true, false, false]);
    });

    it('dice quién la declaró o confirmó', () => {
      expect(allergyOrigin(normalizeAllergy({ allergen: 'x', status: 'SUSPECTED', source: 'OWNER' }))).toBe('Declarada por ti');
      expect(allergyOrigin(normalizeAllergy({ allergen: 'x', status: 'CONFIRMED', veterinaryName: 'Dra. Ruiz' }))).toBe('Confirmada por Dra. Ruiz');
      expect(allergyOrigin(normalizeAllergy({ allergen: 'x', status: 'CONFIRMED' }))).toBe('Confirmada por una clínica');
      expect(allergyOrigin(normalizeAllergy({ allergen: 'x', status: 'SUSPECTED', source: 'CLINIC', veterinaryName: 'Patitas' }))).toBe('Registrada por Patitas');
    });
  });

  describe('esterilización', () => {
    it('lee el objeto de la colección: origen y confirmación de la clínica', () => {
      const n = normalizeNeutered({ status: 'YES', at: '2024-03-01', source: 'CLINIC', confirmedByEmployeeId: 'emp-1' });
      expect(n.status).toBe('YES');
      expect(n.at).toBe('2024-03-01');
      expect(n.source).toBe('CLINIC');
      expect(n.confirmed).toBeTrue();
    });

    it('acepta los nombres neuteredStatus/neuteredAt, texto y booleanos', () => {
      expect(normalizeNeutered({ neuteredStatus: 'NO' }).status).toBe('NO');
      expect(normalizeNeutered({ neuteredAt: '2024-03-01T00:00:00Z', neuteredStatus: 'YES' }).at).toBe('2024-03-01');
      expect(normalizeNeutered('YES').status).toBe('YES');
      expect(normalizeNeutered(true).status).toBe('YES');
      expect(normalizeNeutered(false).status).toBe('NO');
    });

    it('sin dato o dato raro queda "sin confirmar" (nunca afirma sí ni no)', () => {
      for (const v of [null, undefined, {}, 'quizás', 42]) expect(normalizeNeutered(v).status).toBe('UNKNOWN');
      expect(neuteredLabel(normalizeNeutered(null))).toBe('Sin confirmar');
      expect(neuteredOrigin(normalizeNeutered(null))).toBe('');
    });

    it('el texto dice la fecha y quién lo confirmó', () => {
      const declared = normalizeNeutered({ status: 'YES', at: '2024-03-01', source: 'OWNER' });
      expect(neuteredLabel(declared)).toContain('2024');
      expect(neuteredLabel(declared).startsWith('Sí · desde')).toBeTrue();
      expect(neuteredOrigin(declared)).toBe('Declarado por ti');
      const confirmed = normalizeNeutered({ status: 'YES', source: 'OWNER', confirmedByEmployeeId: 'e', confirmedByName: 'Dra. Ruiz' });
      expect(neuteredLabel(confirmed)).toBe('Sí');
      expect(neuteredOrigin(confirmed)).toBe('Confirmado por Dra. Ruiz');
    });
  });

  describe('normalizeSummary', () => {
    it('arma el resumen del perfil con la respuesta de clinical-summary', () => {
      const s = normalizeSummary({
        data: {
          allergies: [{ id: '1', allergen: 'Penicilina', severity: 'SEVERE', status: 'CONFIRMED' }],
          neutered: { status: 'YES', source: 'OWNER' },
          prevention: { INTERNAL: { registered: true, lastApplicationDate: '2026-10-01', nextDoseDate: '2026-11-01' }, EXTERNAL: { registered: false } },
        },
      }, TODAY);
      expect(s.allergyStatus).toBe('HAS_ALLERGIES');
      expect(s.allergies[0].allergen).toBe('Penicilina');
      expect(s.neutered.status).toBe('YES');
      expect(s.prevention.INTERNAL.state).toBe('OVERDUE');
      expect(s.prevention.EXTERNAL.state).toBe('NONE');
    });

    it('con un resumen vacío no falla', () => {
      const s = normalizeSummary({}, TODAY);
      expect(s.allergyStatus).toBe('UNKNOWN');
      expect(s.neutered.status).toBe('UNKNOWN');
      expect(s.prevention.INTERNAL.state).toBe('NONE');
    });
  });

  describe('errores', () => {
    it('conserva los códigos del backend', () => {
      for (const code of ['ACTIVE_ALLERGIES_EXIST', 'OWNER_CANNOT_CONFIRM', 'REASON_REQUIRED', 'VALIDATION_ERROR', 'PET_NOT_OWNED', 'NO_ACCESS_TO_PET']) {
        expect(parseHealthError({ status: 409, error: { code } }).code).toBe(code as any);
      }
    });

    it('una ruta que el gateway todavía no publica (404 sin código) es "no disponible"', () => {
      expect(parseHealthError({ status: 404, error: { error: 'Not Found', message: 'No static resource api/allergies.' } }).code).toBe('NOT_AVAILABLE');
      expect(parseHealthError({ status: 503, error: { message: 'Medical pet service is currently unavailable.' } }).code).toBe('NOT_AVAILABLE');
      expect(parseHealthError({ status: 405 }).code).toBe('NOT_AVAILABLE');
    });

    it('sin conexión y errores raros', () => {
      expect(parseHealthError({ status: 0 }).code).toBe('NETWORK');
      expect(parseHealthError({ status: 500, error: 'boom' }).code).toBe('UNKNOWN');
      expect(parseHealthError(null).code).toBe('NETWORK');
    });

    it('cada error tiene un texto para el usuario', () => {
      const codes = ['ACTIVE_ALLERGIES_EXIST', 'OWNER_CANNOT_CONFIRM', 'REASON_REQUIRED', 'VALIDATION_ERROR', 'PET_NOT_OWNED', 'NO_ACCESS_TO_PET', 'NOT_AVAILABLE', 'NETWORK', 'UNKNOWN'];
      for (const code of codes) expect(healthErrorText({ code: code as any, status: 0, message: '' }).length).toBeGreaterThan(10);
    });
  });
});
