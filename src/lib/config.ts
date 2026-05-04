import config from '../../wevm.config'

/**
 * The shape of `wevm.config.ts` — the single source of truth for site
 * content (curated lists, team, sponsors).
 */
export type Config = {
  /**
   * GitHub logins to drop from the live GitHub Sponsors tail rendered
   * by the homepage Sponsors section. Use this to hide defunct /
   * acquired orgs that still have an active Sponsors entry but whose
   * brand we no longer want to display (e.g. `contextwtf`, where
   * Context shut down).
   *
   * Matches `Sponsor.login` from the GitHub GraphQL response — the
   * same key the homepage already dedups `highlighted.sponsors`
   * against, so the semantics line up.
   */
  excludedSponsors?: ReadonlyArray<string>
  /**
   * Curated priority lists. Rendered first, before the auto-discovered
   * tail (org repos for `projects`, GitHub Sponsors for `sponsors`).
   */
  highlighted: {
    /**
     * Curated, ordered project list rendered by the homepage Projects
     * section. `github` is the canonical join key for stars + repo
     * metadata; `npm` is the canonical join key for downloads.
     */
    projects: ReadonlyArray<{
      /** Manual override for `repository.description`. */
      desc?: string
      /** `owner/repo` — canonical join key for stars/metadata. */
      github: string
      /** Manual override for `repository.homepageUrl`. */
      href?: string
      /** Display name. */
      name: string
      /** npm package name — canonical join key for downloads. */
      npm?: string
    }>
    /**
     * Curated priority sponsors. Rendered before the auto-discovered
     * GitHub Sponsors tail. Listing a brand here is a statement that
     * they sponsor wevm (financially or as an org-level collaborator).
     *
     * `github` is the canonical id — used as the logo `<slug>` (and
     * `public/logos/<github>.svg` filename), the dedup key against
     * live Sponsors, and the source of `name` + `websiteUrl` (fetched
     * from the GitHub org at sync time, baked into KV).
     */
    sponsors: ReadonlyArray<{
      /**
       * Personal GitHub login that sponsors on behalf of this org.
       * The live Sponsors entry under this login is rewritten to
       * render as this org (login → `github`, name + website pulled
       * from the org). Also dedups so the org isn't double-rendered.
       */
      alias?: string
      /**
       * GitHub org login. Drives logo file lookup, KV slug,
       * dedup against live GitHub Sponsors, and is the input to
       * `Github.fetchOrg` for `name` + `websiteUrl`.
       */
      github: string
      /**
       * Render tier. Drives both group order
       * (`collaborator → large → small`) and logo size
       * (`collaborator: 60px`, `large + small: 22px`).
       */
      type: 'collaborator' | 'large' | 'small'
    }>
  }
  /**
   * Per-slug optical-scale overrides for the logo normalization
   * pipeline. The default optical scale is `1` — the brand mark fills
   * ~73 % of the canonical canvas height. Tune individual brands here
   * when their wordmark feels visually too heavy or too light against
   * the rest of the row (e.g. icon+wordmark lockups read taller than
   * pure wordmarks at the same x-height).
   *
   * Read at logo-generation time by `scripts/lib/svg.ts.transform`.
   */
  logoOverrides?: Record<string, { scale?: number }>
  /** Wevm team members rendered in the Team section. */
  team: ReadonlyArray<{
    /** GitHub login. */
    github: string
    /** Display handle. */
    handle: string
    /** Optional Twitter/X handle (without `@`). */
    twitter?: string
  }>
  /**
   * Brands rendered in the Hero "Trusted in production by" marquee.
   * `slug` is the canonical brand identifier — KV cache key, manifest
   * key, disk-override filename. Required (no kebab fallback).
   */
  usedBy: ReadonlyArray<{
    /** Brand homepage. */
    href: string
    /** Display name. */
    name: string
    /** Canonical brand identifier. */
    slug: string
  }>
}

/**
 * Typed identity helper for `wevm.config.ts`. Preserves literal types
 * via the `const` generic so callers get full inference downstream.
 */
export function define<const config extends Config>(config: config): config {
  return config
}

/** Return the parsed `wevm.config.ts`. */
export function get(): Config {
  return config
}
