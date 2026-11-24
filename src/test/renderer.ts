import type { ReactElement } from 'react';

type TestInstance = {
  type: string;
  props: Record<string, unknown>;
  queryAll: (predicate: (instance: TestInstance) => boolean) => TestInstance[];
};

type TestRoot = {
  render: (element: ReactElement) => void;
  unmount: () => void;
  container: TestInstance;
};

declare const require: {
  (id: string): { createRoot: () => TestRoot };
  resolve: (id: string, options?: { paths: string[] }) => string;
};

// Use the renderer already shipped by jest-expo, including with pnpm's isolated dependencies.
export const { createRoot } = require(require.resolve('test-renderer', {
  paths: [require.resolve('jest-expo/package.json')],
}));
