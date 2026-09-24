import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProviders, AppRoutes } from '../App';

export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
}

/** Renders the real app (providers + routes) at a URL, with a fresh cache. */
export function renderApp(path = '/dashboard', queryClient = createTestQueryClient()) {
  const utils = render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders queryClient={queryClient}>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  );
  return { ...utils, queryClient };
}

/** Renders a component inside all providers (no route table). */
export function renderWithProviders(ui: ReactElement, queryClient = createTestQueryClient()) {
  const utils = render(
    <MemoryRouter>
      <AppProviders queryClient={queryClient}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  );
  return { ...utils, queryClient };
}
