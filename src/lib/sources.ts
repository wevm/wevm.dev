import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import logoManifest from '../../public/logos/manifest.json'
import * as Kv from '../../worker/lib/kv'
import type * as Github from '../../worker/sources/github'
import type * as Logos from '../../worker/sources/logos'
import type * as Npm from '../../worker/sources/npm'
import * as Config from './config'

const config = Config.get()

/** Bound Kv instance for the SSR loader. */
const kv = Kv.from(env.KV)

/**
 * Loader payload shape: every source the homepage consumes, fetched in
 * parallel from KV. Each KV-backed field is `undefined` on KV miss
 * (cold deploy before the first sync). UI degrades to em-dashes on
 * missing values.
 */
export type LoaderData = {
  /** Per-repo star + metadata map. Keyed by `owner/repo`. */
  stars: Github.Stars | undefined
  /** Per-package monthly download counts. Keyed by package name. */
  downloads: Npm.Downloads | undefined
  /** GitHub Sponsors tail (Organizations only, >= $500/mo). */
  sponsors: readonly Github.Sponsor[] | undefined
  /** Slug → aspect-ratio manifest for resolved logo SVGs. */
  logoManifest: Logos.LogoManifest
}

/**
 * Server function called by the homepage `loader`. Reads every
 * KV-backed source the homepage needs in parallel and returns a
 * single payload that gets serialized into the SSR HTML hydration
 * blob. The logo manifest is bundled at build time.
 */
export const loadAll = createServerFn({ method: 'GET' }).handler(async (): Promise<LoaderData> => {
  const [stars, downloads, sponsors] = await Promise.all([
    kv.get('stars'),
    kv.get('downloads'),
    kv.get('sponsors'),
  ])
  return { stars, downloads, sponsors, logoManifest }
})

/**
 * Lazy-loaded "extras" — every wevm-org repo that isn't already
 * hand-curated in `config.highlighted.projects`. The KV `repos` array
 * is pre-filtered (no archived/forks/private) and pre-sorted by stars
 * desc by `Sync.runStars`; this just trims out the curated entries
 * (joined by `nameWithOwner` ↔ `github`) so the homepage can append
 * them under the curated list when the user expands "View N more…".
 *
 * Returns `[]` on KV miss (cold deploy) — UI hides the disclosure in
 * that case rather than surfacing a broken/empty expansion.
 */
export const loadRepos = createServerFn({ method: 'GET' }).handler(
  async (): Promise<readonly Github.Repo[]> => {
    const repos = await kv.get('repos')
    if (!repos) return []
    const curated = new Set(config.highlighted.projects.map((p) => p.github))
    return repos.filter((r) => !curated.has(r.nameWithOwner))
  },
)
