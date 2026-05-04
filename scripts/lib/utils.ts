import { existsSync } from 'node:fs'
import { getPlatformProxy } from 'wrangler'

/**
 * Run `fn` with a `Cloudflare.Env` proxy, then dispose. Toggles to
 * remote bindings (production KV) when `WRANGLER_REMOTE=true`.
 *
 * `getPlatformProxy` only surfaces vars/secrets declared in wrangler
 * config (or `.dev.vars`). For sync scripts we additionally fall back
 * to `process.env` for the small set of secrets the worker reads — so
 * CI can pass `GH_PAT` through the workflow `env:` block without
 * having to materialise a `.dev.vars` file.
 */
const passthrough = ['GH_PAT'] as const
export async function withEnv(fn: (env: Cloudflare.Env) => Promise<void>): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env')
  const remote = process.env.WRANGLER_REMOTE === 'true'
  const { env, dispose } = await getPlatformProxy<Cloudflare.Env>({ remoteBindings: remote })
  for (const key of passthrough) {
    const fallback = process.env[key]
    if (fallback && !env[key]) env[key] = fallback
  }
  try {
    await fn(env)
  } finally {
    await dispose()
  }
}
