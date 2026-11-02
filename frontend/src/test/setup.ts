import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { tokenStore } from '../api/client';
import { resetDb } from './msw/handlers';
import { server } from './msw/server';

// jsdom lacks these browser APIs used by Recharts / theme detection.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
})) as typeof window.matchMedia;
URL.createObjectURL ??= () => 'blob:mock';
URL.revokeObjectURL ??= () => undefined;
// jsdom's Blob has no stream(). When MSW answers a `responseType: 'blob'` XHR (file
// downloads), Node 22's undici Response calls it; Node 24 doesn't, so CI alone failed.
Blob.prototype.stream ??= function stream(this: Blob) {
  const read = () => this.arrayBuffer();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(new Uint8Array(await read()));
      controller.close();
    },
  });
} as Blob['stream'];

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  resetDb();
  tokenStore.set(null);
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
