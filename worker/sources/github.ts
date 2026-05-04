import { graphql } from '@octokit/graphql'
import * as Retry from '../lib/retry'

/** Required `User-Agent` on the GitHub API. */
const userAgent = 'wevm.dev (+https://wevm.dev)'

/** Authenticated GitHub provider. */
export type Github = {
  /**
   * Authenticated GraphQL request function. Re-uses Octokit's typed
   * graphql client with `bearer` auth bound at construction time.
   */
  graphql: typeof graphql
}

/**
 * Build a Github provider from a fine-grained PAT (`public_repo` read).
 * Pass the token explicitly so callers stay portable across worker /
 * Node script execution.
 */
export function from(token: string): Github {
  return {
    graphql: graphql.defaults({
      headers: { authorization: `bearer ${token}`, 'user-agent': userAgent },
    }),
  }
}

/**
 * Repo metadata. Same shape used by both the upstream fetch and the KV
 * cache — `description`/`homepageUrl` are `undefined` when GitHub returns
 * an empty value.
 */
export type Repo = {
  /** `owner/repo`. */
  nameWithOwner: string
  /** Display name (`repo` portion). */
  name: string
  /** Repo description from GitHub (omitted when empty). */
  description?: string
  /** `repository.homepageUrl` (omitted when empty). */
  homepageUrl?: string
  /** Star count. */
  stargazerCount: number
}

/**
 * Per-repo metadata cached under the `stars` KV key. Keyed by
 * `owner/repo`. Topbar sums `stargazerCount` across entries.
 */
export type Stars = Record<
  string,
  { stargazerCount: number; description?: string; homepageUrl?: string }
>

/** A sponsor written to KV by {@link import('../sync.js').runSponsors}. */
export type Sponsor = {
  /** GitHub org login (canonical id, also the logo `<slug>`). */
  login: string
  /** Display name (falls back to `login`). */
  name: string
  /** Brand homepage. */
  websiteUrl?: string
  /** Avatar URL. */
  avatarUrl?: string
  /**
   * Render tier. `collaborator` and `large` originate from
   * `config.highlighted.sponsors`; `small` is derived from any live
   * GitHub Sponsor not in that list.
   */
  type: 'collaborator' | 'large' | 'small'
  /** Monthly tier amount in USD (0 for collaborator-only entries). */
  monthlyAmount: number
  /** ISO timestamp; tiebreaker when amounts are equal. */
  createdAt: string
}

/** Bare org metadata returned by {@link fetchOrg}. */
export type Org = {
  /** GitHub org login. */
  login: string
  /** Display name (falls back to `login`). */
  name: string
  /** `organization.websiteUrl` (omitted when empty). */
  websiteUrl?: string
  /** `organization.avatarUrl`. */
  avatarUrl: string
}

/** Minimal `package.json` shape used by sync to enumerate npm packages. */
export type PackageJson = {
  /** Published package name; entries with no name are ignored. */
  name?: string
  /** Skip when `true` — these are never published to npm. */
  private?: boolean
}

/**
 * Fetch every non-archived, non-fork, public repository in `org`.
 * Sorted by stargazer count desc. Paginated transparently.
 */
export async function fetchRepos(github: Github, org: string): Promise<readonly Repo[]> {
  const query = `query($org: String!, $cursor: String) {
    organization(login: $org) {
      repositories(
        first: 100
        after: $cursor
        isFork: false
        privacy: PUBLIC
        orderBy: { field: STARGAZERS, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          nameWithOwner
          name
          description
          homepageUrl
          stargazerCount
          isArchived
        }
      }
    }
  }`
  type Result = {
    organization: {
      repositories: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
        nodes: ReadonlyArray<{
          nameWithOwner: string
          name: string
          description: string | null
          homepageUrl: string | null
          stargazerCount: number
          isArchived: boolean
        }>
      }
    }
  }
  const repos: Repo[] = []
  let cursor: string | null = null
  for (;;) {
    const data: Result = await retry(() => github.graphql(query, { org, cursor }))
    for (const node of data.organization.repositories.nodes) {
      if (node.isArchived) continue
      repos.push({
        nameWithOwner: node.nameWithOwner,
        name: node.name,
        description: node.description || undefined,
        homepageUrl: node.homepageUrl || undefined,
        stargazerCount: node.stargazerCount,
      })
    }
    if (!data.organization.repositories.pageInfo.hasNextPage) break
    cursor = data.organization.repositories.pageInfo.endCursor
  }
  return repos
}

/**
 * Fetch active GitHub Sponsors for `org`. Filtered to Organizations
 * (individuals dropped) and `>= $500/mo`. Sorted by monthly tier desc,
 * `createdAt` ascending as tiebreaker.
 */
export async function fetchSponsors(github: Github, org: string): Promise<readonly Sponsor[]> {
  const query = `query($org: String!, $cursor: String) {
    organization(login: $org) {
      sponsorshipsAsMaintainer(
        first: 100
        after: $cursor
        activeOnly: true
        includePrivate: false
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          createdAt
          tier { monthlyPriceInDollars }
          sponsorEntity {
            __typename
            ... on Organization { login name websiteUrl avatarUrl }
          }
        }
      }
    }
  }`
  type Result = {
    organization: {
      sponsorshipsAsMaintainer: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
        nodes: ReadonlyArray<{
          createdAt: string
          tier: { monthlyPriceInDollars: number } | null
          sponsorEntity:
            | {
                __typename: 'Organization'
                login: string
                name: string | null
                websiteUrl: string | null
                avatarUrl: string
              }
            | { __typename: 'User' }
            | null
        }>
      }
    }
  }
  const sponsors: Sponsor[] = []
  let cursor: string | null = null
  for (;;) {
    const data: Result = await retry(() => github.graphql(query, { org, cursor }))
    for (const node of data.organization.sponsorshipsAsMaintainer.nodes) {
      // skip individual sponsors; only Organizations qualify per the plan
      if (node.sponsorEntity?.__typename !== 'Organization') continue
      const monthly = node.tier?.monthlyPriceInDollars ?? 0
      if (monthly < 500) continue
      // GitHub returns `websiteUrl` with or without a scheme
      // (`family.co` vs `https://family.co`); normalize at write time so
      // every downstream reader (Brandfetch lookup, `<a href>`) gets a
      // consistent absolute URL.
      const website = node.sponsorEntity.websiteUrl || undefined
      sponsors.push({
        login: node.sponsorEntity.login,
        name: node.sponsorEntity.name ?? node.sponsorEntity.login,
        websiteUrl: website && !/^https?:\/\//.test(website) ? `https://${website}` : website,
        avatarUrl: node.sponsorEntity.avatarUrl || undefined,
        // Default tier — `runSponsors` rewrites this to `collaborator` /
        // `large` for entries that match `highlighted.sponsors`.
        type: 'small',
        monthlyAmount: monthly,
        createdAt: node.createdAt,
      })
    }
    if (!data.organization.sponsorshipsAsMaintainer.pageInfo.hasNextPage) break
    cursor = data.organization.sponsorshipsAsMaintainer.pageInfo.endCursor
  }
  sponsors.sort(
    (a, b) => b.monthlyAmount - a.monthlyAmount || a.createdAt.localeCompare(b.createdAt),
  )
  return sponsors
}

/**
 * Fetch bare org metadata (name + websiteUrl + avatarUrl) for a single
 * GitHub login. Used by {@link import('../sync.js').runSponsors} to
 * resolve `config.highlighted.sponsors` entries that aren't on GitHub
 * Sponsors (collaborator-only orgs like Paradigm). Returns `null` when
 * the login doesn't resolve to an Organization.
 */
export async function fetchOrg(github: Github, login: string): Promise<Org | null> {
  const query = `query($login: String!) {
    organization(login: $login) { login name websiteUrl avatarUrl }
  }`
  type Result = {
    organization: {
      login: string
      name: string | null
      websiteUrl: string | null
      avatarUrl: string
    } | null
  }
  const data: Result = await retry(() => github.graphql(query, { login }))
  const org = data.organization
  if (!org) return null
  const website = org.websiteUrl || undefined
  return {
    login: org.login,
    name: org.name ?? org.login,
    // Same scheme normalization as `fetchSponsors`.
    websiteUrl: website && !/^https?:\/\//.test(website) ? `https://${website}` : website,
    avatarUrl: org.avatarUrl,
  }
}

/**
 * Walk root + `src/` + `packages/*` for each repo and collect every parsed
 * `package.json`. One GraphQL request per repo (batched via `Promise.all`).
 * `package.json` entries that fail to parse are silently skipped.
 *
 * The `src/package.json` lookup catches monorepos where the root is
 * `private: true` and the published package lives at `src/` (e.g. viem, ox,
 * vocs, isows, hono-og).
 */
export async function fetchPackageJsons(
  github: Github,
  repos: ReadonlyArray<{ nameWithOwner: string }>,
): Promise<ReadonlyArray<{ nameWithOwner: string; pkg: PackageJson }>> {
  const query = `query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      rootPkg: object(expression: "HEAD:package.json") {
        ... on Blob { text }
      }
      srcPkg: object(expression: "HEAD:src/package.json") {
        ... on Blob { text }
      }
      packagesDir: object(expression: "HEAD:packages") {
        ... on Tree {
          entries {
            name
            object {
              ... on Tree {
                entries {
                  name
                  object { ... on Blob { text } }
                }
              }
            }
          }
        }
      }
    }
  }`
  type Result = {
    repository: {
      rootPkg: { text: string } | null
      srcPkg: { text: string } | null
      packagesDir: {
        entries: ReadonlyArray<{
          name: string
          object: {
            entries: ReadonlyArray<{ name: string; object: { text: string } | null }>
          } | null
        }>
      } | null
    } | null
  }
  const out: Array<{ nameWithOwner: string; pkg: PackageJson }> = []
  await Promise.all(
    repos.map(async (repo) => {
      const [owner, name] = repo.nameWithOwner.split('/')
      if (!owner || !name) return
      const data: Result = await retry(() => github.graphql(query, { owner, repo: name }))
      if (!data.repository) return
      const { rootPkg, srcPkg, packagesDir } = data.repository
      const collect = (text: string | undefined) => {
        if (!text) return
        try {
          out.push({ nameWithOwner: repo.nameWithOwner, pkg: JSON.parse(text) })
        } catch {
          // unparseable package.json; skip
        }
      }
      collect(rootPkg?.text)
      collect(srcPkg?.text)
      for (const entry of packagesDir?.entries ?? []) {
        const file = entry.object?.entries.find((e) => e.name === 'package.json')
        collect(file?.object?.text)
      }
    }),
  )
  return out
}

/**
 * Wrap an Octokit GraphQL call with retry. 5 attempts, exponential
 * from 200ms — matches the Phase 2 retry policy for GitHub's API.
 * Octokit's own thrown errors carry status + retry-after info on the
 * `response` field but we don't yet special-case them.
 */
async function retry<const result>(fn: () => Promise<result>): Promise<result> {
  return Retry.retry(fn, { attempts: 5, baseMs: 200, factor: 2 })
}
