import config from '../wevm.config'
import * as Kv from './lib/kv'
import * as Github from './sources/github'
import * as Npm from './sources/npm'

/** GitHub org we sync — every Phase 2 KV key is scoped to this org. */
const org = 'wevm'

/**
 * Orchestrate a periodic sync — every source whose inputs change
 * continuously: GitHub stars, npm downloads, live GitHub Sponsors.
 *
 * Logo bytes are git-tracked, so the logo pipeline runs offline via
 * `pnpm gen:logos` (in CI on push) — not here.
 *
 * `runSponsors` runs first so the homepage can read consistent
 * sponsor + tier data even if `runStars`/`runDownloads` race.
 *
 * Uses `Promise.allSettled` so a partial failure (e.g. npm 5xx)
 * doesn't roll back a completed write.
 */
export async function runAll(env: Cloudflare.Env): Promise<void> {
  await runSponsors(env)
  const results = await Promise.allSettled([runStars(env), runDownloads(env)])
  for (const [i, r] of results.entries())
    if (r.status === 'rejected')
      console.error(`runAll[${['runStars', 'runDownloads'][i]}]`, r.reason)
  await Kv.from(env.KV).put('updatedAt', new Date().toISOString())
}

/**
 * Pull every wevm repo from GitHub, write the per-repo metadata map
 * to `stars`, and the full sorted list to `repos`. Both KV keys are
 * derived from the same GraphQL response.
 */
export async function runStars(env: Cloudflare.Env): Promise<void> {
  const kv = Kv.from(env.KV)
  const github = Github.from(env.GITHUB_TOKEN)
  const repos = await Github.fetchRepos(github, org)
  const stars: Github.Stars = {}
  for (const r of repos)
    stars[r.nameWithOwner] = {
      stargazerCount: r.stargazerCount,
      description: r.description,
      homepageUrl: r.homepageUrl,
      createdAt: r.createdAt,
    }
  await Promise.all([kv.put('stars', stars), kv.put('repos', repos)])
}

/**
 * Discover every public, non-`private` npm package under any wevm repo
 * (root + `src/` + `packages/*`), look up monthly downloads in bulk,
 * and write the `downloads` map.
 */
export async function runDownloads(env: Cloudflare.Env): Promise<void> {
  const kv = Kv.from(env.KV)
  const github = Github.from(env.GITHUB_TOKEN)
  const repos = await Github.fetchRepos(github, org)
  const pkgs = await Github.fetchPackageJsons(github, repos)
  const names = new Set<string>()
  for (const { pkg } of pkgs) if (pkg.name && pkg.private !== true) names.add(pkg.name)
  const downloads = await Npm.fetchDownloads([...names])
  await kv.put('downloads', downloads)
}

/**
 * Build the unified `sponsors` array consumed by the homepage:
 *
 * 1. Pull live GitHub Sponsors (Organizations only, ≥ $500/mo).
 * 2. Apply `highlighted.sponsors[*].alias` — rewrite the personal
 *    sponsoring login to its parent org's `github`. This lets a person
 *    sponsoring on behalf of a company render as that company.
 * 3. For every `highlighted.sponsors` entry, fetch org metadata
 *    (`name`, `websiteUrl`) when not already present in the live
 *    sponsors list, and stamp the curated `type`. Highlighted entries
 *    that don't appear in the live list (collaborators) get a synthetic
 *    sponsor row with `monthlyAmount: 0`.
 * 4. Live sponsors not in `highlighted` default to `type: 'small'`.
 * 5. Sort by render tier, then monthly amount desc, then `createdAt`.
 *
 * Output: `Github.Sponsor[]` — already typed + ordered, so the
 * homepage just maps over it.
 */
export async function runSponsors(env: Cloudflare.Env): Promise<void> {
  const kv = Kv.from(env.KV)
  const github = Github.from(env.GITHUB_TOKEN)
  const live = await Github.fetchSponsors(github, org)

  // Read through the structural `Config` type — the `define` `const`
  // generic narrows literal entries so much that `alias` only appears
  // on the entries that declared it, and we want to walk all entries
  // uniformly.
  const highlighted = config.highlighted.sponsors as ReadonlyArray<{
    github: string
    alias?: string
    type: 'collaborator' | 'large' | 'small'
  }>

  // Personal-login → highlighted-github lookup, lowercased for
  // case-insensitive matches against GitHub Sponsor logins.
  const aliases: Record<string, string> = {}
  for (const h of highlighted)
    if (h.alias) aliases[h.alias.toLowerCase()] = h.github

  // Index live sponsors by lowercased login (post-alias) so highlighted
  // resolution can pick up tier amounts + websiteUrl + avatar without
  // a second GitHub fetch. Login is also normalized to lowercase here
  // because it's the canonical slug downstream — `<img src="/logo/:slug">`,
  // `public/logos/<slug>.svg`, KV `logo:<slug>` — and we don't want
  // GitHub's casing (`Polymarket`, `SyndicateProtocol`) leaking into
  // case-sensitive file lookups.
  const liveByLogin: Record<string, Github.Sponsor> = {}
  for (const s of live) {
    const slug = (aliases[s.login.toLowerCase()] ?? s.login).toLowerCase()
    liveByLogin[slug] = { ...s, login: slug }
  }

  // Resolve every highlighted entry. If we found a live row above,
  // upgrade it with the highlighted `type` (collaborator/large beats
  // the small default); else fetch org metadata for a synthetic entry.
  const resolved: Github.Sponsor[] = []
  const claimed = new Set<string>()
  for (const h of highlighted) {
    const key = h.github.toLowerCase()
    claimed.add(key)
    const matched = liveByLogin[key]
    if (matched) {
      resolved.push({ ...matched, type: h.type })
      continue
    }
    const meta = await Github.fetchOrg(github, h.github)
    if (!meta) {
      console.error(`runSponsors: fetchOrg(${h.github}) returned null`)
      continue
    }
    resolved.push({
      login: meta.login.toLowerCase(),
      name: meta.name,
      websiteUrl: meta.websiteUrl,
      avatarUrl: meta.avatarUrl,
      type: h.type,
      monthlyAmount: 0,
      createdAt: new Date().toISOString(),
    })
  }

  // Tail: live sponsors not claimed by any highlighted entry.
  for (const [key, s] of Object.entries(liveByLogin))
    if (!claimed.has(key)) resolved.push({ ...s, type: 'small' })

  resolved.sort(
    (a, b) =>
      typeOrder[a.type] - typeOrder[b.type] ||
      b.monthlyAmount - a.monthlyAmount ||
      a.createdAt.localeCompare(b.createdAt),
  )

  await kv.put('sponsors', resolved)
}

/** Ordering for `Github.Sponsor.type`. Collaborators first, small last. */
const typeOrder = { collaborator: 0, large: 1, small: 2 } as const


