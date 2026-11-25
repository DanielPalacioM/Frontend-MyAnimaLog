import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CalendarPage } from './calendar.page';
import { PetService } from 'src/app/services/PetService/pet';
import { CalendarService } from 'src/app/services/CalendarService/calendar';
import { TutorialService } from 'src/app/services/TutorialService/tutorial';
import { AppointmentService } from 'src/app/services/AppointmentService/appointment';
import { Appointment } from 'src/app/models/appointment.model';

const appt = (over: Partial<Appointment>): Appointment => ({
  id: 'a1', veterinaryId: 'v1', clinicName: 'Clínica Patitas', clinicLogoUrl: null, address: '', petId: 'p1', petName: 'Leo',
  serviceId: 's1', serviceName: 'Consulta general', durationMinutes: 30, price: 50000, employeeName: '',
  startsAt: '2027-01-04T13:30:00.000Z', endsAt: '2027-01-04T14:00:00.000Z', status: 'CONFIRMED', origin: 'CLINIC', notes: '',
  cancellationReason: '', cancelledBy: '', cancellableUntil: null, ...over,
});

describe('CalendarPage · citas con la clínica', () => {
  const navigate = jasmine.createSpy('navigate');

  function setup(clinic: any) {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate, navigateByUrl: () => {} } },
        { provide: PetService, useValue: { getPets: () => of([{ id: 'p1', name: 'Leo' }]) } },
        { provide: CalendarService, useValue: { getAllUserEvents: () => of([]), deleteEvent: () => of(null) } },
        { provide: TutorialService, useValue: { hasSeen: () => true, getSteps: () => [], markSeen: () => {} } },
        { provide: AppointmentService, useValue: { getMine: () => clinic } },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new CalendarPage(
      TestBed.inject(Router), TestBed.inject(PetService), TestBed.inject(CalendarService), TestBed.inject(TutorialService), TestBed.inject(AppointmentService),
    ));
    page.ngOnInit();
    return page;
  }

  it('la cita que la clínica agendó sale en su día y a su hora (Bogotá), marcada como de la clínica', () => {
    const page = setup(of([appt({})]));
    const ev = page.events.find(e => e.id === 'appt:a1')!;
    expect(ev.date).toBe('2027-01-04');
    expect(ev.time).toBe('08:30');
    expect(ev.endTime).toBe('09:00');
    expect(ev.fromClinic).toBeTrue();
    expect(ev.title).toBe('Consulta general');
    expect(ev.description).toContain('Clínica Patitas');
  });

  it('no muestra las citas canceladas, rechazadas ni las ya atendidas', () => {
    const page = setup(of([appt({ id: 'c', status: 'CANCELLED' }), appt({ id: 'r', status: 'REJECTED' }), appt({ id: 'd', status: 'COMPLETED' }), appt({ id: 'ok', status: 'REQUESTED' })]));
    expect(page.events.map(e => e.id)).toEqual(['appt:ok']);
    expect(page.events[0].description).toContain('Pendiente de confirmación');
  });

  it('si Calendar falla, el calendario sigue con los eventos manuales', () => {
    const page = setup(throwError(() => new Error('cors')));
    expect(page.events).toEqual([]);
    expect(page.loading).toBeFalse();
  });

  it('"ver" una cita de la clínica lleva a Mis citas de esa clínica', () => {
    const page = setup(of([appt({})]));
    page.openClinicAppointment(page.events[0]);
    expect(navigate).toHaveBeenCalledWith(['/vet/appointments'], { queryParams: { veterinaryId: 'v1' } });
  });
});
