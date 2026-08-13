import { TestBed } from '@angular/core/testing';

import { SharedProfile } from './shared-profile';

describe('SharedProfile', () => {
  let service: SharedProfile;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SharedProfile);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
