import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { Embedder } from '@/matching/embedder';

const lexical: Embedder = { id: 'lexical', dimensions: 3, embed: async () => [] };
let mockActive: Embedder = lexical;
const mockCreate = jest.fn<() => Promise<unknown>>();
const mockStorage = new Map<string, string>();

jest.mock('@/matching/active', () => ({
  getEmbedder: () => mockActive,
  setEmbedder: (e: Embedder) => {
    mockActive = e;
  },
}));
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: { fs: { exists: async () => true, unlink: async () => {} } },
}));
jest.mock('react-native-executorch', () => ({
  models: { textEmbeddings: { ALL_MINILM_L6_V2: { XNNPACK_INT8: { modelPath: 'm', tokenizerPath: 't' } } } },
  setTelemetryEnabled: () => {},
  download: async (model: unknown, options: { onProgress?: (p: number) => void }) => {
    options.onProgress?.(0.5);
    return model;
  },
  createTextEmbedder: () => mockCreate(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStorage.get(key) ?? null,
    setItem: async (key: string, value: string) => void mockStorage.set(key, value),
    removeItem: async (key: string) => void mockStorage.delete(key),
  },
}));

type Provider = typeof import('./embedder-provider');

/** A fresh copy of the module-level store, plus the status sequence and progress it reports. */
async function freshProvider() {
  let provider!: Provider;
  jest.isolateModules(() => {
    provider = jest.requireActual<Provider>('./embedder-provider');
  });
  const statuses = [provider.getNeuralMatching().status];
  const progress: number[] = [];
  provider.subscribeNeuralMatching(() => {
    const { status, progress: p } = provider.getNeuralMatching();
    if (statuses.at(-1) !== status) statuses.push(status);
    progress.push(p);
  });
  return { provider, statuses, progress };
}

const workingRunner = {
  embed: async () => new Float32Array(384).fill(1),
  embedWorklet: () => new Float32Array(384),
  dispose: () => {},
};

beforeEach(() => {
  mockActive = lexical;
  mockCreate.mockReset();
  mockStorage.clear();
});

describe('embedder provider', () => {
  it('goes idle -> downloading -> ready and activates the neural embedder', async () => {
    mockCreate.mockResolvedValue(workingRunner);
    const { provider, statuses, progress } = await freshProvider();
    await provider.startEmbedder();
    expect(statuses).toEqual(['idle', 'downloading', 'ready']);
    expect(progress).toContain(0.5);
    expect(mockActive.id).toBe('minilm-l6-v2');
    expect(mockActive.dimensions).toBe(384);
  });

  it('ends in failed with the lexical embedder active when loading rejects', async () => {
    mockCreate.mockRejectedValue(new Error('LOAD_FAILED'));
    const { provider, statuses } = await freshProvider();
    await provider.startEmbedder();
    expect(statuses).toEqual(['idle', 'downloading', 'failed']);
    expect(mockActive).toBe(lexical);
  });

  it('falls back to lexical when an embed call fails after loading', async () => {
    mockCreate.mockResolvedValue({ ...workingRunner, embed: async () => Promise.reject(new Error('boom')) });
    const { provider, statuses } = await freshProvider();
    await provider.startEmbedder();
    await expect(mockActive.embed(['hi'])).rejects.toThrow('Embedding failed: boom');
    expect(statuses.at(-1)).toBe('failed');
    expect(mockActive).toBe(lexical);
  });

  it('ends in failed when the native module throws at import (web, Expo Go)', async () => {
    const { provider, statuses } = await freshProvider();
    jest.isolateModules(() => {
      jest.doMock('./neural-embedder', () => {
        throw new Error("TurboModuleRegistry.getEnforcing(...): 'RnExecutorch' could not be found");
      });
    });
    await provider.startEmbedder();
    jest.dontMock('./neural-embedder');
    expect(statuses).toEqual(['idle', 'downloading', 'failed']);
    expect(mockActive).toBe(lexical);
  });

  it('stays off and never downloads when the flag is false', async () => {
    mockStorage.set('eventor:neuralMatching', 'false');
    const { provider, statuses } = await freshProvider();
    await provider.startEmbedder();
    expect(statuses.at(-1)).toBe('off');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockActive).toBe(lexical);
  });

  it('switching off restores lexical and removing returns to idle', async () => {
    mockCreate.mockResolvedValue(workingRunner);
    const { provider, statuses } = await freshProvider();
    await provider.startEmbedder();
    await provider.setNeuralMatching(false);
    expect(mockActive).toBe(lexical);
    expect(statuses.at(-1)).toBe('off');
    expect(mockStorage.get('eventor:neuralMatching')).toBe('false');
    await provider.removeNeuralModel();
    expect(statuses.at(-1)).toBe('idle');
  });
});
