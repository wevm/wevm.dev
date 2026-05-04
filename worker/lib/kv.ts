import type * as Github from '../sources/github'
import type * as Npm from '../sources/npm'

/**
 * Schema mapping KV key → cached value type. Adding a key here is the
 * only place to update when introducing a new KV-backed source —
 * `get`/`put` infer their value type from the key argument via this
 * schema. JSDoc on each property surfaces on hover at the call site.
 *
 * All values are JSON-encoded on write and JSON-parsed on read,
 * including primitives (`updatedAt` is stored as `"2024-01-01T…"`).
 */
type Schema = {
  /** Per-repo star + metadata map. Keyed by `owner/repo`. */
  stars: Github.Stars
  /** Full filtered wevm-org repo list (sorted by stars desc). */
  repos: readonly Github.Repo[]
  /** GitHub Sponsors tail (Organizations only, >= $500/mo, sorted by tier desc). */
  sponsors: readonly Github.Sponsor[]
  /** Per-package monthly download counts. Keyed by npm package name. */
  downloads: Npm.Downloads
  /** ISO timestamp of the last successful sync. */
  updatedAt: string
}

/**
 * Strongly-typed Kv wrapper around a `KVNamespace`. `get`/`put`/`delete`
 * infer their value type from the key argument via {@link Schema}.
 * Build via {@link from}.
 */
export type Kv = {
  /** Read a typed value. Returns `undefined` on KV miss. */
  get<key extends keyof Schema>(key: key): Promise<Schema[key] | undefined>
  /** Write a typed value. Serialized as JSON. */
  put<key extends keyof Schema>(key: key, value: Schema[key]): Promise<void>
  /** Remove a key. No-op when the key isn't present. */
  delete<key extends keyof Schema>(key: key): Promise<void>
}

/**
 * Bind a strongly-typed Kv to the given namespace. Pass `env.KV`
 * from a Hono request handler, the SSR loader, or the
 * `getPlatformProxy` env in `scripts/gen:data.ts`.
 */
export function from(kv: KVNamespace): Kv {
  return {
    async get(key) {
      return (await kv.get(key, 'json')) ?? undefined
    },
    async put(key, value) {
      await kv.put(key, JSON.stringify(value))
    },
    async delete(key) {
      await kv.delete(key)
    },
  }
}
