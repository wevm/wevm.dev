import * as Retry from '../lib/retry'

/** Bulk-downloads endpoint. Accepts up to 128 packages per call. */
const endpoint = 'https://api.npmjs.org/downloads/point/last-month'

/** Maximum packages per `point` lookup; npm registry limit. */
const batchSize = 128

/**
 * Per-package monthly download counts cached under the `downloads` KV
 * key. Keyed by npm package name. Topbar sums values across entries.
 */
export type Downloads = Record<string, number>

/**
 * Fetch last-month download counts for every package in `packages`.
 * Skips entries that the registry returns as `null` (unpublished or
 * never installed).
 *
 * Bulk endpoint quirks:
 *  - **Scoped packages** (`@wagmi/cli`) are NOT supported in the bulk
 *    list — including one in a batch returns 400. Query them one at a
 *    time.
 *  - Unscoped packages batch up to 128 per call.
 */
export async function fetchDownloads(packages: readonly string[]): Promise<Downloads> {
  const scoped = packages.filter((p) => p.startsWith('@'))
  const unscoped = packages.filter((p) => !p.startsWith('@'))
  const result: Downloads = {}
  await Promise.all([
    ...chunk(unscoped, batchSize).map((batch) => lookup(batch, result)),
    ...scoped.map((name) => lookup([name], result)),
  ])
  return result
}

/** Fetch one bulk-or-single request and merge into `result`. */
async function lookup(batch: readonly string[], result: Downloads): Promise<void> {
  if (batch.length === 0) return
  const url = `${endpoint}/${batch.join(',')}`
  const response = await Retry.retry(() => fetch(url), { attempts: 3, baseMs: 200, factor: 2 })
  if (!response.ok) throw new Error(`npm ${response.status} for ${url}`)
  const body = await response.json()
  // single-package response: { downloads, start, end, package }
  // multi-package response: Record<package, { downloads, ... } | null>
  if (batch.length === 1) {
    const single = body as { downloads: number; package: string }
    if (typeof single.downloads === 'number') result[single.package] = single.downloads
    return
  }
  const multi = body as Record<string, { downloads: number } | null>
  for (const [name, info] of Object.entries(multi)) if (info) result[name] = info.downloads
}

/** Split `items` into fixed-size chunks. */
function chunk<const item>(items: readonly item[], size: number): Array<readonly item[]> {
  const out: Array<readonly item[]> = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}
