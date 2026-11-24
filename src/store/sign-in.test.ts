import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { requireSignIn, setSignInRequiredHandler } from '@/components/auth/require-sign-in';
import { makeGuestState } from '@/backend/state';

describe('sign-in required handler', () => {
  afterEach(() => setSignInRequiredHandler(null));

  it('calls the registered handler', () => {
    const fn = jest.fn();
    setSignInRequiredHandler(fn);
    requireSignIn();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no handler is registered', () => {
    requireSignIn();
    expect(true).toBe(true);
  });
});

describe('guest state', () => {
  it('is an empty, stable state with no meetings or selections', () => {
    const guest = makeGuestState();
    expect(guest.profile.id).toBe('guest');
    expect(guest.meetings).toHaveLength(0);
    expect(guest.profile.selections).toHaveLength(0);
    expect(guest.bookmarks.mySessions).toHaveLength(0);
    expect(guest.reelLikes).toHaveLength(0);
    expect(guest.reelSaves).toHaveLength(0);
  });
});
