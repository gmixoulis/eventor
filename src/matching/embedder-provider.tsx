import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { getEmbedder, setEmbedder } from '@/matching/active';
import type { Embedder } from '@/matching/embedder';
import type { NeuralEmbedder } from '@/matching/neural-embedder';

// Required lazily, inside try blocks: the native module throws at import on web and in Expo Go.
const neuralModule = (): typeof import('./neural-embedder') =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/matching/neural-embedder');

export const NEURAL_FLAG_KEY = 'eventor:neuralMatching';
const FILES_KEY = 'eventor:neuralModelFiles';

export type ModelStatus = 'idle' | 'downloading' | 'ready' | 'failed' | 'off';
export type ModelState = { status: ModelStatus; progress: number; enabled: boolean };

let state: ModelState = { status: 'idle', progress: 0, enabled: true };
let neural: NeuralEmbedder | null = null;
let basic: Embedder | null = null;
let generation = 0;
let started = false;
const listeners = new Set<() => void>();

function update(patch: Partial<ModelState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribeNeuralMatching(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getNeuralMatching = (): ModelState => state;

function fallBack(): void {
  neural?.dispose();
  neural = null;
  if (basic && getEmbedder() !== basic) setEmbedder(basic);
}

function fail(run: number): void {
  if (run !== generation) return;
  generation++;
  fallBack();
  update({ status: 'failed' });
}

async function load(): Promise<void> {
  const run = ++generation;
  basic ??= getEmbedder();
  update({ status: 'downloading', progress: 0 });
  try {
    const { createNeuralEmbedder } = neuralModule();
    const next = await createNeuralEmbedder((progress) => {
      if (run === generation) update({ progress });
    });
    if (run !== generation) {
      next.dispose();
      return;
    }
    neural = next;
    await AsyncStorage.setItem(FILES_KEY, JSON.stringify(next.files)).catch(() => {});
    // A failed embed drops back to basic matching; the cleared caches make the recommender recompute.
    setEmbedder({
      ...next,
      embed: (texts) =>
        next.embed(texts).catch((error: unknown) => {
          fail(run);
          throw error;
        }),
    });
    update({ status: 'ready', progress: 1 });
  } catch {
    fail(run);
  }
}

export async function startEmbedder(): Promise<void> {
  if (started) return;
  started = true;
  let enabled = true;
  try {
    enabled = (await AsyncStorage.getItem(NEURAL_FLAG_KEY)) !== 'false';
  } catch {}
  update({ enabled });
  if (enabled) await load();
  else update({ status: 'off' });
}

export async function setNeuralMatching(enabled: boolean): Promise<void> {
  update({ enabled });
  await AsyncStorage.setItem(NEURAL_FLAG_KEY, String(enabled)).catch(() => {});
  if (enabled) {
    await load();
    return;
  }
  generation++;
  fallBack();
  update({ status: 'off', progress: 0 });
}

/** Deletes the downloaded model files. Rejects if the files could not be removed. */
export async function removeNeuralModel(): Promise<void> {
  let files = neural?.files;
  if (!files) {
    const raw = await AsyncStorage.getItem(FILES_KEY).catch(() => null);
    files = raw ? (JSON.parse(raw) as string[]) : [];
  }
  generation++;
  fallBack();
  update({ status: 'idle', progress: 0 });
  await neuralModule().deleteModelFiles(files);
  await AsyncStorage.removeItem(FILES_KEY).catch(() => {});
}

export function useNeuralMatching(): ModelState {
  return useSyncExternalStore(subscribeNeuralMatching, getNeuralMatching);
}

/** Loads the on-device model in the background; matching keeps using the basic embedder meanwhile. */
export function EmbedderProvider() {
  useEffect(() => {
    void startEmbedder();
  }, []);
  return null;
}
