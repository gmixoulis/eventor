import { describe, expect, it, jest } from '@jest/globals';

import { norm } from '@/matching/embedder';
import { createNeuralEmbedder, MAX_INPUT_CHARS, NEURAL_DIMENSIONS } from '@/matching/neural-embedder';

const mockEmbed = jest.fn(async (input: string) => new Float32Array(384).fill(input.length));
const mockCreate = jest.fn(async () => ({ embed: mockEmbed, embedWorklet: jest.fn(), dispose: jest.fn() }));

jest.mock('react-native-blob-util', () => ({ __esModule: true, default: { fs: {} } }));
jest.mock('react-native-executorch', () => ({
  models: { textEmbeddings: { ALL_MINILM_L6_V2: { XNNPACK_INT8: { modelPath: 'm', tokenizerPath: 't' } } } },
  setTelemetryEnabled: jest.fn(),
  download: jest.fn(async (model: unknown) => model),
  createTextEmbedder: (...args: unknown[]) => mockCreate(...(args as [])),
}));

describe('createNeuralEmbedder', () => {
  it('returns unit vectors of 384 dimensions', async () => {
    const embedder = await createNeuralEmbedder();
    const vectors = await embedder.embed(['hello', 'world!']);
    expect(embedder.id).toBe('minilm-l6-v2');
    expect(vectors).toHaveLength(2);
    for (const v of vectors) {
      expect(v).toHaveLength(NEURAL_DIMENSIONS);
      expect(norm(v)).toBeCloseTo(1, 5);
    }
  });

  it('truncates long input before tokenizing', async () => {
    const embedder = await createNeuralEmbedder();
    await embedder.embed(['x'.repeat(MAX_INPUT_CHARS * 3)]);
    expect(mockEmbed).toHaveBeenLastCalledWith('x'.repeat(MAX_INPUT_CHARS));
  });

  it('returns a zero vector for empty text instead of calling the model', async () => {
    mockEmbed.mockClear();
    const embedder = await createNeuralEmbedder();
    const [v] = await embedder.embed(['   ']);
    expect(norm(v)).toBe(0);
    expect(mockEmbed).not.toHaveBeenCalled();
  });

  it('surfaces a load failure as an Error', async () => {
    mockCreate.mockRejectedValueOnce('LOAD_FAILED');
    await expect(createNeuralEmbedder()).rejects.toThrow('Could not load the matching model: LOAD_FAILED');
  });

  it('surfaces an inference failure as an Error', async () => {
    mockEmbed.mockRejectedValueOnce(new Error('RESOURCE_BUSY'));
    const embedder = await createNeuralEmbedder();
    await expect(embedder.embed(['hi'])).rejects.toThrow('Embedding failed: RESOURCE_BUSY');
  });
});
