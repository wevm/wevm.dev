import * as Sync from './sync'

/**
 * Cloudflare scheduled handler — wired in `worker/index.ts` and
 * triggered by the cron expression in `wrangler.jsonc`.
 *
 * Delegates to {@link Sync.runAll} so the cron-driven path and
 * `pnpm gen:data` execute the exact same sync logic. Wrapping the
 * call in `ctx.waitUntil` keeps the handler responsive while the
 * sync runs to completion in the background — the worker stays
 * alive until the promise resolves (or rejects, in which case the
 * error surfaces in observability).
 */
export function scheduled(
  _controller: ScheduledController,
  env: Cloudflare.Env,
  ctx: ExecutionContext,
): void {
  ctx.waitUntil(Sync.runAll(env))
}
