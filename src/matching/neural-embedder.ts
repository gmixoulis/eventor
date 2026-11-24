import RNBlobUtil from 'react-native-blob-util';
import { createTextEmbedder, download, models, setTelemetryEnabled } from 'react-native-executorch';

import { normalize, type Embedder, type Vector } from '@/matching/embedder';

// int8 XNNPACK runs on every device and simulator; the model card reports retrieval equal to fp32.
export const NEURAL_MODEL = models.textEmbeddings.ALL_MINILM_L6_V2.XNNPACK_INT8;
export const NEURAL_ID = 'minilm-l6-v2';
export const NEURAL_DIMENSIONS = 384;
// The library truncates to the model's token limit (256 upstream); this only bounds tokenizer work.
export const MAX_INPUT_CHARS = 2000;

export type NeuralEmbedder = Embedder & {
  /** Local paths of the downloaded model and tokenizer, for deletion. */
  files: string[];
  dispose(): void;
};

function asError(cause: unknown, message: string): Error {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return new Error(`${message}: ${detail}`, { cause });
}

export async function createNeuralEmbedder(
  onProgress?: (progress: number) => void,
): Promise<NeuralEmbedder> {
  let runner: Awaited<ReturnType<typeof createTextEmbedder>>;
  let files: string[];
  try {
    setTelemetryEnabled(false);
    const local = await download(NEURAL_MODEL, { onProgress });
    files = [local.modelPath, local.tokenizerPath];
    runner = await createTextEmbedder(local);
  } catch (error) {
    throw asError(error, 'Could not load the matching model');
  }

  return {
    id: NEURAL_ID,
    dimensions: NEURAL_DIMENSIONS,
    files,
    dispose: () => runner.dispose(),
    async embed(texts) {
      const out: Vector[] = [];
      // One at a time: the runner rejects concurrent calls with RESOURCE_BUSY.
      for (const text of texts) {
        const input = text.trim().slice(0, MAX_INPUT_CHARS);
        if (!input) {
          // Empty text tokenizes to zero tokens, which the runner rejects.
          out.push(new Float32Array(NEURAL_DIMENSIONS));
          continue;
        }
        try {
          out.push(normalize(await runner.embed(input)));
        } catch (error) {
          throw asError(error, 'Embedding failed');
        }
      }
      return out;
    },
  };
}

export async function deleteModelFiles(files: string[]): Promise<void> {
  for (const path of files) {
    if (await RNBlobUtil.fs.exists(path)) await RNBlobUtil.fs.unlink(path);
  }
}
