import { TestBed } from '@angular/core/testing';

import { Vaccine } from './vaccine';

describe('Vaccine', () => {
  let service: Vaccine;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Vaccine);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
