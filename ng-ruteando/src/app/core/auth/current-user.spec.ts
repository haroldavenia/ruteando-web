import { TestBed } from '@angular/core/testing';

import { makeUser } from '../../../testing/session';
import { CurrentUser } from './current-user';

describe('CurrentUser', () => {
  let currentUser: CurrentUser;

  beforeEach(() => {
    currentUser = TestBed.inject(CurrentUser);
  });

  it('empieza anónimo', () => {
    expect(currentUser.user()).toBeNull();
    expect(currentUser.isAuthenticated()).toBeFalse();
    expect(currentUser.role()).toBeNull();
    expect(currentUser.tenantId()).toBeNull();
  });

  it('expone id, email, rol y tenantId del usuario con sesión', () => {
    currentUser.set(makeUser({ id: 'u9', email: 'otra@example.invalid', role: 'driver', tenantId: 't9' }));

    expect(currentUser.isAuthenticated()).toBeTrue();
    expect(currentUser.user()?.id).toBe('u9');
    expect(currentUser.user()?.email).toBe('otra@example.invalid');
    expect(currentUser.role()).toBe('driver');
    expect(currentUser.tenantId()).toBe('t9');
  });

  it('clear() vuelve a dejarlo anónimo', () => {
    currentUser.set(makeUser());
    currentUser.clear();

    expect(currentUser.isAuthenticated()).toBeFalse();
    expect(currentUser.tenantId()).toBeNull();
  });
});
