import { isDemoMode } from './isDemoMode';

/** Return demo data in screenshot mode; otherwise run the real fetch. */
export function withDemo<T>(demoData: T, fetchFn: () => Promise<T>): () => Promise<T> {
  return async () => {
    if (isDemoMode()) return demoData;
    return fetchFn();
  };
}

/** Same as withDemo but demo data depends on runtime args (e.g. user id). */
export function withDemoFn<TArgs extends unknown[], TResult>(
  demoFn: (...args: TArgs) => TResult,
  fetchFn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    if (isDemoMode()) return demoFn(...args);
    return fetchFn(...args);
  };
}
