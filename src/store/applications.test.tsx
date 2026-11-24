import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, useEffect } from 'react';

import { api } from '@/backend/api';
import type { ReviewRow } from '@/backend/applications-api';
import { getSideEvent } from '@/data';
import { itemStartMs, sideEventToItem } from '@/lib/agenda-item';
import { useEventRequests } from '@/store/applications';
import { useStoreValue } from '@/store/context';
import { useEventClock } from '@/store/event-clock';
import { createRoot } from '@/test/renderer';

jest.mock('@/backend/api', () => ({ api: { applications: { listForEvent: jest.fn(), decide: jest.fn() } } }));
jest.mock('@/store/context', () => ({ useStoreValue: jest.fn() }));
jest.mock('@/store/event-clock', () => ({ useEventClock: jest.fn() }));
jest.mock('@/store/reservations', () => ({ withoutReservation: jest.fn() }));

const EVENT = 'se-pitch-clinic';
const row: ReviewRow = {
  application: {
    id: 'app-1', accountId: 'acct-media', sideEventId: EVENT, name: 'Applicant',
    email: 'applicant@example.com', note: '', status: 'pending', createdAt: '2026-01-01T00:00:00Z',
  },
  score: 1, label: 'Good fit', reason: null,
};

let root: ReturnType<typeof createRoot>;
let result: ReturnType<typeof useEventRequests>;
const context = {
  accountId: 'acct-investor', accountIdRef: { current: 'acct-investor' },
  reservedCounts: {}, setState: jest.fn(), refreshReservations: jest.fn(async () => {}),
};

function Probe() {
  const value = useEventRequests(EVENT);
  useEffect(() => { result = value; }, [value]);
  return null;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  jest.clearAllMocks();
  jest.mocked(useStoreValue).mockReturnValue(context as unknown as ReturnType<typeof useStoreValue>);
  jest.mocked(useEventClock).mockReturnValue({
    now: new Date('2026-01-01T00:00:00Z'), isDemo: true, presetId: null, setPreset: jest.fn(),
  });
  jest.mocked(api.applications.listForEvent).mockResolvedValue([row]);
  root = createRoot();
});

afterEach(async () => {
  await act(async () => root.unmount());
});

describe('event request loading', () => {
  it('updates seats on a clock tick without reloading or rescoring applicants', async () => {
    await act(async () => root.render(<Probe />));
    expect(result.rows).toEqual([row]);
    expect(result.seatsLeft).toBe(40);
    const event = getSideEvent(EVENT)!;
    jest.mocked(useEventClock).mockReturnValue({
      now: new Date(itemStartMs(sideEventToItem(event))), isDemo: true, presetId: null, setPreset: jest.fn(),
    });
    await act(async () => root.render(<Probe />));
    expect(result.seatsLeft).toBeLessThan(40);
    expect(result.rows).toEqual([row]);
    expect(api.applications.listForEvent).toHaveBeenCalledTimes(1);
  });

  it('surfaces Not allowed instead of returning an empty request list', async () => {
    jest.mocked(api.applications.listForEvent).mockRejectedValue(new Error('Not allowed'));
    await act(async () => root.render(<Probe />));
    expect(result.error).toBe('Not allowed');
    expect(result.rows).toBeNull();
  });

  it('reloads the applicant list and seat counts after a decision', async () => {
    await act(async () => root.render(<Probe />));
    jest.mocked(api.applications.decide).mockResolvedValue({ ...row.application, status: 'approved' });
    await act(async () => {
      expect(await result.decide('app-1', 'approve')).toBeNull();
    });
    expect(api.applications.listForEvent).toHaveBeenCalledTimes(2);
    expect(context.refreshReservations).toHaveBeenCalledTimes(1);
  });
});
