import { existsSync } from 'node:fs'
import { getPlatformProxy } from 'wrangler'

/**
 * Run `fn` with a `Cloudflare.Env` proxy, then dispose. Toggles to
 * remote bindings (production KV) when `WRANGLER_REMOTE=true`.
 */
export async function withEnv(fn: (env: Cloudflare.Env) => Promise<void>): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env')
  const remote = process.env.WRANGLER_REMOTE === 'true'
  const { env, dispose } = await getPlatformProxy<Cloudflare.Env>({ remoteBindings: remote })
  try {
    await fn(env)
  } finally {
    await dispose()
  }
}
