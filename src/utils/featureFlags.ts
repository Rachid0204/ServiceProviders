/**
 * Centralized feature flag helpers.
 *
 * Production builds NEVER enable mock/demo fixtures. Seeded providers and
 * preview applicants are strictly isolated to local development when
 * `VITE_ENABLE_DEMO_FIXTURES=true` is explicitly configured.
 */
export function isDemoFixturesEnabled(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
  if (!env) return false;
  return Boolean(
    env.DEV === true && String(env.VITE_ENABLE_DEMO_FIXTURES ?? '').toLowerCase() === 'true'
  );
}
