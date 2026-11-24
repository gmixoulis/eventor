import { afterEach, describe, expect, it, jest } from '@jest/globals';

afterEach(() => { jest.dontMock('@/lib/features'); });

describe('ticket rules across registry versions', () => {
  it.each([false, true])('uses ticket words only when registered: %s', (registered) => {
    jest.isolateModules(() => {
      jest.doMock('@/lib/features', () => {
        const actual = jest.requireActual<typeof import('@/lib/features')>('@/lib/features');
        const features = actual.FEATURES.filter((feature) => feature.id !== ('tickets' as string));
        const registry = [...features, ...(registered ? [{ id: 'tickets', label: 'Tickets', default: true, dependsOn: [], paths: ['/tickets'] }] : [])];
        return { ...actual, FEATURES: registry, featureLabel: (id: string) => registry.find((feature) => feature.id === id)!.label };
      });
      const { applySetupRules, suggestSetup } = jest.requireActual<typeof import('@/lib/event-setup')>('@/lib/event-setup');
      for (const word of ['ticket', 'tickets', 'ticketing']) {
        for (const [command, on] of [['add', true], ['remove', false]] as const) {
          const result = applySetupRules(`${command} ${word} and map`, {});
          expect(result.fields.features).toEqual({ ...(registered ? { tickets: on } : {}), map: on });
          expect(result.changes).toEqual(['Map ' + (on ? 'on' : 'off'), ...(registered ? ['Tickets ' + (on ? 'on' : 'off')] : [])]);
        }
        expect(suggestSetup(`no ${word} or map`).features).toEqual({ ...(registered ? { tickets: false } : {}), map: false });
      }
    });
  });
});
