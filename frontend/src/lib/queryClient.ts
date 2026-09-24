import { QueryClient } from '@tanstack/react-query';
import { errorStatus } from '../api/client';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't hammer the API on 4xx (validation/auth/not-found won't fix themselves).
        retry: (failureCount, error) => {
          const status = errorStatus(error);
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: true,
      },
    },
  });
}
