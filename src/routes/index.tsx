import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import * as Config from '~/lib/config'
import * as Sources from '~/lib/sources'
import type * as Github from '../../worker/sources/github'

const config = Config.get()

export const Route = createFileRoute('/')({
  component: Home,
  loader: () => Sources.loadAll(),
})

function Home() {
  return (
    <div className="p-[clamp(20px,4vw,56px)]">
      <div className="mx-auto max-w-[880px]">
        <div className="border border-primary bg-panel p-[clamp(24px,4vw,48px)]">
          <Topbar />
          <Hero />
          <Projects />
          <Team />
          <Collaborators />
          <Sponsors />
          <Footer />
        </div>
      </div>
    </div>
  )
}

/** Em-dash fallback rendered for every Topbar/project value not yet in KV. */
const dash = '——'

function Topbar() {
  const { stars, downloads } = Route.useLoaderData()
  const total_stars = stars
    ? Object.values(stars).reduce((sum, r) => sum + r.stargazerCount, 0)
    : undefined
  const total_downloads = downloads
    ? Object.values(downloads).reduce((sum, n) => sum + n, 0)
    : undefined
  return (
    <header className="mb-8 flex items-center justify-between gap-4 border-b border-dashed border-soft pb-5 max-[640px]:flex-col max-[640px]:items-start">
      <div className="flex items-center gap-[14px]">
        <h1 className="sr-only">wevm</h1>
        <svg
          width="80"
          height="16"
          viewBox="0 0 311 63"
          fill="none"
          xmlns="https://www.w3.org/2000/svg"
          aria-hidden="true"
          className="block text-primary"
        >
          <path
            d="M17.24 61.12C16.52 53.28 15.68 45.8 14.72 38.68C13.84 31.48 12.96 24.48 12.08 17.68C11.84 16 11.48 14.96 11 14.56C10.52 14.08 9.91999 13.84 9.19999 13.84C7.67999 13.84 5.79999 15.24 3.55999 18.04L0.799988 14.8C4.07999 10.32 7.19999 6.92 10.16 4.6C13.12 2.28 16.08 1.12 19.04 1.12C22.16 1.12 24.48 2.04 26 3.88C27.52 5.72 28.48 8.56 28.88 12.4C29.44 17.2 29.92 22.24 30.32 27.52C30.72 32.8 31.08 38.08 31.4 43.36C34.68 37.04 37.92 30.6 41.12 24.04C44.4 17.48 47.6 10.76 50.72 3.88H61.16C61.56 6.52 61.96 9.68 62.36 13.36C62.76 16.96 63.16 20.8 63.56 24.88C64.04 28.88 64.48 32.8 64.88 36.64C65.28 40.48 65.68 43.96 66.08 47.08C68.8 43.4 71.32 39.76 73.64 36.16C75.96 32.56 78.24 28.76 80.48 24.76L79.04 20.56C78.48 18.96 77.92 17.32 77.36 15.64C76.8 13.96 76.52 12.36 76.52 10.84C76.52 7.4 77.52 4.88 79.52 3.27999C81.52 1.59999 83.92 0.759995 86.72 0.759995C87.84 0.759995 88.88 0.959996 89.84 1.36C90.8 1.68 91.56 2.03999 92.12 2.43999C92.76 3.4 93.2 4.4 93.44 5.43999C93.68 6.48 93.8 7.92 93.8 9.76C93.8 11.52 93.44 13.48 92.72 15.64C92.08 17.8 90.72 20.8 88.64 24.64C85.68 30 81.8 35.88 77 42.28C72.28 48.6 66.92 54.88 60.92 61.12L52.16 62.08L50.96 61.12C50.56 58.08 50.12 54.56 49.64 50.56C49.16 46.48 48.68 42.4 48.2 38.32C47.72 34.16 47.24 30.44 46.76 27.16C44.04 32.52 41.08 38.16 37.88 44.08C34.76 50 31.56 55.68 28.28 61.12L18.56 62.08L17.24 61.12Z"
            fill="currentColor"
          />
          <path
            d="M125.84 7.71999C124.16 7.71999 122.36 8.43999 120.44 9.88C118.6 11.24 116.84 13.16 115.16 15.64C113.48 18.12 112.04 20.96 110.84 24.16C109.72 27.36 109.08 30.72 108.92 34.24C114.36 32.32 118.64 30.2 121.76 27.88C124.88 25.48 127.08 23.04 128.36 20.56C129.64 18.08 130.28 15.76 130.28 13.6C130.28 11.6 129.84 10.12 128.96 9.16C128.08 8.2 127.04 7.71999 125.84 7.71999ZM113 62.8C106.76 62.8 101.68 60.8 97.76 56.8C93.92 52.8 92 47.28 92 40.24C92 35.04 92.88 30.12 94.64 25.48C96.48 20.76 99 16.6 102.2 13C105.4 9.32 109.16 6.44 113.48 4.35999C117.8 2.2 122.48 1.12 127.52 1.12C132.96 1.12 137.08 2.32 139.88 4.72C142.76 7.12 144.2 10.24 144.2 14.08C144.2 19.12 141.32 23.84 135.56 28.24C129.88 32.56 121.08 36.2 109.16 39.16C109.56 43 110.8 45.84 112.88 47.68C114.96 49.52 117.64 50.44 120.92 50.44C124.44 50.44 127.56 49.56 130.28 47.8C133 46.04 135.28 44 137.12 41.68L140.48 44.08C138.88 47.12 136.72 50.08 134 52.96C131.36 55.84 128.28 58.2 124.76 60.04C121.24 61.88 117.32 62.8 113 62.8Z"
            fill="currentColor"
          />
          <path
            d="M164.24 61.12C163.44 53.28 162.6 45.84 161.72 38.8C160.92 31.68 160.04 24.68 159.08 17.8C158.84 16.04 158.44 14.96 157.88 14.56C157.4 14.08 156.84 13.84 156.2 13.84C155.48 13.84 154.64 14.16 153.68 14.8C152.8 15.44 151.76 16.52 150.56 18.04L147.8 14.8C151.08 10.32 154.2 6.92 157.16 4.6C160.12 2.28 163.12 1.12 166.16 1.12C169.2 1.12 171.48 2.08 173 4C174.52 5.91999 175.52 8.84 176 12.76C176.64 18.36 177.2 24.16 177.68 30.16C178.16 36.08 178.6 42.04 179 48.04C184.84 40.44 190 32.56 194.48 24.4L193.28 20.44C192.72 18.84 192.16 17.24 191.6 15.64C191.12 13.96 190.88 12.36 190.88 10.84C190.88 7.4 191.8 4.88 193.64 3.27999C195.56 1.59999 197.96 0.759995 200.84 0.759995C201.96 0.759995 203 0.959996 203.96 1.36C205 1.68 205.8 2.03999 206.36 2.43999C207 3.4 207.44 4.4 207.68 5.43999C207.92 6.48 208.04 7.92 208.04 9.76C208.04 11.44 207.72 13.36 207.08 15.52C206.44 17.68 205.04 20.72 202.88 24.64C199.92 29.92 195.92 35.8 190.88 42.28C185.84 48.68 180.24 54.96 174.08 61.12L165.44 62.08L164.24 61.12Z"
            fill="currentColor"
          />
          <path
            d="M228.4 61L212.8 61.96L211.12 60.52L220.96 13.6L212.56 12.28L213.4 7.84L237.88 0.999999L240.16 2.92L238.12 13.48C242.12 9.64 246.16 6.64 250.24 4.48C254.4 2.24 258.32 1.12 262 1.12C264.64 1.12 266.84 1.96 268.6 3.64C270.36 5.32 271.24 7.84 271.24 11.2C271.24 11.6 271.24 12.04 271.24 12.52C271.24 12.92 271.2 13.32 271.12 13.72C275.12 9.71999 279.16 6.64 283.24 4.48C287.4 2.24 291.32 1.12 295 1.12C297.56 1.12 299.72 1.96 301.48 3.64C303.24 5.32 304.12 7.84 304.12 11.2C304.12 12.8 303.96 14.48 303.64 16.24C303.4 18 303.04 19.8 302.56 21.64L296.92 44.32C296.6 45.44 296.32 46.44 296.08 47.32C295.92 48.12 295.84 48.84 295.84 49.48C295.84 51.08 296.48 51.88 297.76 51.88C299.76 51.88 302.72 49.4 306.64 44.44L310.24 46.84C308.64 49.56 306.68 52.16 304.36 54.64C302.12 57.04 299.52 59 296.56 60.52C293.68 62.04 290.48 62.8 286.96 62.8C284.16 62.8 281.96 62.16 280.36 60.88C278.84 59.52 278.08 57.64 278.08 55.24C278.08 53.4 278.28 51.52 278.68 49.6C279.16 47.68 279.64 45.84 280.12 44.08L284.56 26.08C285.04 24.24 285.4 22.56 285.64 21.04C285.96 19.44 286.12 18.16 286.12 17.2C286.12 15.84 285.8 14.88 285.16 14.32C284.6 13.76 283.88 13.48 283 13.48C281.32 13.48 279.36 14.04 277.12 15.16C274.96 16.28 272.56 18.04 269.92 20.44L266.8 35.32C265.92 39.56 265.04 43.84 264.16 48.16C263.36 52.4 262.56 56.68 261.76 61L246.16 61.96L244.48 60.52L251.92 24.76C252.32 23.16 252.64 21.72 252.88 20.44C253.12 19.08 253.24 17.92 253.24 16.96C253.24 15.76 252.92 14.88 252.28 14.32C251.72 13.76 251 13.48 250.12 13.48C248.36 13.48 246.36 14.04 244.12 15.16C241.88 16.28 239.4 18 236.68 20.32L233.44 35.32C232.56 39.56 231.72 43.84 230.92 48.16C230.12 52.4 229.28 56.68 228.4 61Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div className="flex flex-wrap gap-2 font-mono">
        <Badge
          label="NPM DOWNLOADS"
          value={total_downloads !== undefined ? total_downloads.toLocaleString('en-US') : dash}
          unit="/MO"
        />
        <Badge
          label="GH STARS"
          value={total_stars !== undefined ? total_stars.toLocaleString('en-US') : dash}
          unit="★"
        />
      </div>
    </header>
  )
}

function Badge({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="font-mono inline-flex items-center gap-2 border border-dashed border-primary bg-panel px-2 py-1 text-[11px] uppercase leading-none tracking-[0.04em] text-primary tabular-nums whitespace-nowrap">
      <span className="inline-flex items-center gap-1 text-muted">{label}</span>
      <span className="inline-flex items-baseline gap-1">
        <span>{value}</span>
        <span className="text-muted">{unit}</span>
      </span>
    </div>
  )
}

function Hero() {
  return (
    <section className="mb-10 grid grid-cols-1 gap-6">
      <div>
        <div className="text-[clamp(32px,6vw,64px)] font-bold leading-none tracking-[-0.03em]">
          TypeScript tools
          <br />
          for the{' '}
          <i className="font-serif font-normal italic tracking-[-0.015em] px-[0.04em]">frontier</i>
        </div>
        <p className="mt-[18px] max-w-[56ch] text-[clamp(16px,1.6vw,19px)] text-muted">
          <strong className="text-primary font-bold">Wevm</strong> is a collective building
          open-source TypeScript software used by hundreds of enterprise organizations and millions of
          developers worldwide.
        </p>
        <div className="mt-6 flex flex-wrap gap-[10px]">
          <Button href="https://github.com/wevm">
            GitHub <span className="font-mono">→</span>
          </Button>
          <Button href="https://github.com/sponsors/wevm">
            Sponsor <span className="font-mono">→</span>
          </Button>
          <Button className="max-sm:hidden" href="mailto:dev@wevm.dev">
            dev@wevm.dev
          </Button>
        </div>
        <UsedBy />
      </div>
    </section>
  )
}

function Button({
  children,
  className = '',
  href,
}: {
  children: React.ReactNode
  className?: string
  href: string
}) {
  const external = !href.startsWith('mailto:')
  return (
    <a
      className={`inline-flex items-center gap-2 border border-primary bg-panel px-[14px] py-2 text-sm text-primary no-underline transition-colors duration-100 hover:bg-inverted hover:text-inverted ${className}`}
      href={href}
      {...(external ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
    >
      {children}
    </a>
  )
}

function UsedBy() {
  const { logoManifest } = Route.useLoaderData()
  return (
    <div className="mt-7 flex flex-col gap-7">
      <div className="text-lg font-medium tracking-[-0.01em] text-primary">
        Trusted in production by
      </div>
      <div className="group overflow-hidden">
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
          <ul className="m-0 flex shrink-0 list-none items-center text-primary">
            {config.usedBy.map((u) => (
              <UsedByCell key={u.slug} href={u.href} manifest={logoManifest} name={u.name} slug={u.slug} />
            ))}
          </ul>
          <ul
            className="m-0 flex shrink-0 list-none items-center text-primary"
            aria-hidden="true"
          >
            {config.usedBy.map((u) => (
              <UsedByCell
                key={`${u.slug}-dup`}
                href={u.href}
                manifest={logoManifest}
                name={u.name}
                slug={u.slug}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function UsedByCell({
  href,
  manifest,
  name,
  slug,
}: {
  href: string
  manifest: Record<string, number> | undefined
  name: string
  slug: string
}) {
  return (
    // `pr-10` replaces the parent `gap-x-10` so the hover hit-area
    // extends into the inter-logo whitespace — cursoring between two
    // logos still highlights the one on the left.
    <li className="inline-flex shrink-0 items-center pr-10">
      <a
        aria-label={name}
        className="flex h-full w-full items-center no-underline opacity-75 transition-opacity duration-100 hover:opacity-100"
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Mark height={22} manifest={manifest} name={name} slug={slug} />
      </a>
    </li>
  )
}

// Case-insensitive override lookup: GitHub Sponsor logins ship with
// arbitrary casing (e.g. `Polymarket`, `SyndicateProtocol`) but config
// authors shouldn't have to mirror that casing — match on lowercase.
const logoOverrides = Object.fromEntries(
  Object.entries(
    (config.logoOverrides as Record<string, { scale?: number }>) ?? {},
  ).map(([k, v]) => [k.toLowerCase(), v]),
)

/**
 * Render a brand mark — an `<img src="/logo/:slug">` when the slug is
 * in the manifest, else a `<span>` plain-text fallback. No client-side
 * image fallback so SSR HTML is final and there's no broken-image
 * flicker. Width is computed from the manifest aspect ratio so the
 * intrinsic image dimensions match the rendered box (no CLS).
 */
function Mark({
  height,
  manifest,
  name,
  slug,
}: {
  height: number
  manifest: Record<string, number> | undefined
  name: string
  slug: string
}) {
  const ratio = manifest?.[slug]
  if (ratio === undefined)
    return <span className="text-lg font-medium tracking-[-0.01em] text-primary">{name}</span>
  // Per-slug visual scale lives in config (not the SVG bytes) so we
  // don't have to reason about server-side viewBox clipping. We
  // multiply both `<img>` dimensions so the layout box reflects the
  // visual size — important for the marquee, where transform-based
  // scaling would overflow into the overflow-hidden clip.
  // lowercase to match the case-insensitive override map
  const scale = logoOverrides[slug.toLowerCase()]?.scale ?? 1
  const renderedHeight = height * scale
  return (
    <img
      alt={name}
      className="block w-auto transition-[filter] duration-100"
      data-mark
      height={renderedHeight}
      src={`/logos/mono/${slug}.svg`}
      style={{ height: `${renderedHeight}px` }}
      width={Math.round(renderedHeight * ratio)}
    />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9 border-t border-primary pt-7">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div className="text-[22px] font-bold tracking-[-0.01em]">{title}</div>
      </div>
      {children}
    </section>
  )
}

type Item = {
  name: string
  href: string
  desc: React.ReactNode
  meta?: React.ReactNode
  /** Optional right-aligned trailing slot (e.g. star count on Projects). */
  trailing?: React.ReactNode
}

function Items({ items }: { items: Array<Item> }) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-0 p-0">
      {items.map((it, i) => (
        <li
          key={i}
          // Three columns always with the trailing slot pinned to a fixed
          // width — Projects (with stars) and Team (with an empty slot) end
          // up with the same name + desc column widths so rows line up
          // vertically across sections.
          className="grid items-baseline gap-5 border-b border-dotted border-soft py-3.5 last:border-b-0 grid-cols-[minmax(220px,240px)_minmax(0,1fr)_72px] max-[640px]:grid-cols-1 max-[640px]:gap-1"
        >
          <div className="text-lg font-medium tracking-[-0.01em]">
            <a href={it.href} target="_blank" rel="noopener noreferrer">
              {it.name}
            </a>
            {it.meta && <span className="text-sm font-normal text-muted">{it.meta}</span>}
          </div>
          <div className="text-[15px] text-muted">{it.desc}</div>
          <div className="font-mono text-xs text-muted text-right tabular-nums max-[640px]:text-left">
            {it.trailing}
          </div>
        </li>
      ))}
    </ul>
  )
}

function Projects() {
  const { stars } = Route.useLoaderData()
  const [expanded, setExpanded] = useState(false)

  const curated: Array<Item> = config.highlighted.projects.map((p) => {
    const repo = stars?.[p.github]
    // Capitalize the repo name (after `/`) as the display name fallback —
    // works for `viem` → `Viem`, `wagmi` → `Wagmi`, etc.
    const slug = p.github.split('/')[1] ?? ''
    return {
      name: p.name ?? slug.charAt(0).toUpperCase() + slug.slice(1),
      href: p.href ?? repo?.homepageUrl ?? `https://github.com/${p.github}`,
      desc: p.desc ?? repo?.description ?? '—',
      trailing: (() => {
        if (p.new) return <Trailing forceNew />
        if (repo) return <Trailing count={repo.stargazerCount} createdAt={repo.createdAt} />
        return undefined
      })(),
    }
  })

  // N is computed from the SSR-loaded `stars` map — every wevm-org repo is a
  // key, so `Object.keys(stars).length` is the upper bound. Subtracting curated
  // entries that exist in `stars` gives the disclosure count without an extra
  // KV read; the lazy `loadRepos` fetch only fires when the user expands.
  const curatedInStars = stars
    ? config.highlighted.projects.filter((p) => p.github in stars).length
    : 0
  const total = stars ? Object.keys(stars).length : 0
  const remaining = Math.max(0, total - curatedInStars)

  const [extras, setExtras] = useState<readonly Github.Repo[] | undefined>(undefined)
  useEffect(() => {
    if (!expanded || extras !== undefined) return
    let cancelled = false
    Sources.loadRepos().then((data) => {
      if (!cancelled) setExtras(data)
    })
    return () => {
      cancelled = true
    }
  }, [expanded, extras])

  const extraItems: Array<Item> = (extras ?? []).map((r) => ({
    name: r.name,
    href: r.homepageUrl ?? `https://github.com/${r.nameWithOwner}`,
    desc: r.description ?? '—',
    trailing: <Trailing count={r.stargazerCount} createdAt={r.createdAt} />,
  }))

  return (
    <Section title="Core Projects">
      <Items items={expanded ? [...curated, ...extraItems] : curated} />
      {remaining > 0 && !expanded && (
        <button
          className="mt-4 inline-block text-sm text-muted no-underline hover:text-primary"
          onClick={() => setExpanded(true)}
          type="button"
        >
          View {remaining} more…
        </button>
      )}
    </Section>
  )
}

/** Repos under 6 months old with <100 stars get a "New" badge instead of stars. */
const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6
function isNew(createdAt: string | undefined, stargazerCount: number): boolean {
  if (!createdAt) return false
  if (stargazerCount >= 100) return false
  return Date.now() - new Date(createdAt).getTime() < sixMonthsMs
}

type TrailingProps =
  | { forceNew: true; count?: never; createdAt?: never }
  | { forceNew?: false; count: number; createdAt: string | undefined }

function Trailing(props: TrailingProps) {
  if (props.forceNew || isNew(props.createdAt, props.count))
    return <span className="uppercase tracking-wider">New</span>
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-sm leading-none relative -top-px">★</span>
      {props.count.toLocaleString('en-US')}
    </span>
  )
}

function Team() {
  return (
    <Section title="Team">
      <Items
        items={config.team.map((t) => ({
          name: t.handle,
          href: `https://github.com/${t.github}`,
          desc: (
            <>
              <a href={`https://github.com/${t.github}`} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              {t.twitter && (
                <>
                  ,{' '}
                  <a href={`https://x.com/${t.twitter}`} target="_blank" rel="noopener noreferrer">
                    Twitter
                  </a>
                </>
              )}
            </>
          ),
        }))}
      />
    </Section>
  )
}

function Collaborators() {
  const { sponsors, logoManifest } = Route.useLoaderData()
  const excluded = new Set(config.excludedSponsors ?? [])
  const collaborators = (sponsors ?? []).filter(
    (s) => s.type === 'collaborator' && !excluded.has(s.login),
  )
  if (collaborators.length === 0) return null
  return (
    <Section title="Collaborators">
      <p className="mb-7 text-muted">
        Wevm is an independent collective proudly supported by our collaborators.
      </p>
      <ul className="m-0 grid list-none grid-cols-2 gap-x-10 gap-y-7 p-0">
        {collaborators.map((s) => (
          <li key={s.login} className="flex min-h-6 items-center justify-start">
            <a
              href={s.websiteUrl ?? `https://github.com/${s.login}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.name}
              className="flex w-full items-center no-underline opacity-75 transition-opacity duration-100 hover:opacity-100"
            >
              <Mark height={60} manifest={logoManifest} name={s.name} slug={s.login} />
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Sponsors() {
  const { sponsors, logoManifest } = Route.useLoaderData()
  const excluded = new Set(config.excludedSponsors ?? [])
  const rest = (sponsors ?? []).filter(
    (s) => s.type !== 'collaborator' && !excluded.has(s.login),
  )
  return (
    <Section title="Sponsors">
      <p className="mb-7 text-muted">
        Want to support our work?{' '}
        <a href="https://github.com/sponsors/wevm" target="_blank" rel="noopener noreferrer">
          Become a sponsor
        </a>
        .
      </p>
      <ul className="m-0 grid list-none grid-cols-4 gap-x-6 gap-y-7 p-0 max-[640px]:grid-cols-2">
        {rest.map((s) => (
          <li key={s.login} className="flex min-h-6 items-center justify-start">
            <a
              href={s.websiteUrl ?? `https://github.com/${s.login}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.name}
              className="flex w-full items-center no-underline opacity-75 transition-opacity duration-100 hover:opacity-100"
            >
              <Mark height={22} manifest={logoManifest} name={s.name} slug={s.login} />
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-12 flex flex-wrap justify-between gap-3 border-t border-primary pt-5 font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
      <div>
        <strong className="font-normal text-primary">weth, LLC</strong> — trading as{' '}
        <strong className="font-normal text-primary">wevm</strong>
      </div>
      <div>© 2023–{year}</div>
    </footer>
  )
}
