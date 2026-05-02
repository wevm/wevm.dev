import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/')({
  component: Home,
})

const PACKAGES = ['viem', 'wagmi', 'ox', 'abitype', 'vocs', 'prool']
const REPOS = ['wevm/viem', 'wevm/wagmi', 'wevm/ox', 'wevm/abitype', 'wevm/vocs', 'wevm/prool']

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function useStats() {
  const [downloads, setDownloads] = useState<string>('——')
  const [stars, setStars] = useState<string>('——')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const dl = (await fetch(
          `https://api.npmjs.org/downloads/point/last-month/${PACKAGES.join(',')}`,
        ).then((r) => r.json())) as Record<string, { downloads?: number } | null>
        const total = Object.values(dl).reduce(
          (sum, p) => sum + (p && p.downloads ? p.downloads : 0),
          0,
        )
        if (!cancelled && total > 0) setDownloads(fmt(total))
      } catch {
        // ignore
      }

      try {
        const counts = await Promise.all(
          REPOS.map((r) =>
            fetch(`https://api.github.com/repos/${r}`)
              .then((res) => res.json() as Promise<{ stargazers_count?: number }>)
              .then((j) => j.stargazers_count || 0)
              .catch(() => 0),
          ),
        )
        const total = counts.reduce((a, b) => a + b, 0)
        if (!cancelled && total > 0) setStars(fmt(total))
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { downloads, stars }
}

function Home() {
  const { downloads, stars } = useStats()
  const year = new Date().getFullYear()

  return (
    <div className="p-[clamp(20px,4vw,56px)]">
      <div className="mx-auto max-w-[880px]">
        <div className="border border-(--color-border) bg-(--color-panel) p-[clamp(24px,4vw,48px)]">
          <Topbar downloads={downloads} stars={stars} />
          <Hero />
          <CoreProjects />
          <Collaborations />
          <Team />
          <Sponsors />
          <Footer year={year} />
        </div>
      </div>
    </div>
  )
}

function Topbar({ downloads, stars }: { downloads: string; stars: string }) {
  return (
    <header className="mb-8 flex items-center justify-between gap-4 border-b border-dashed border-(--color-border-soft) pb-5 max-[640px]:flex-col max-[640px]:items-start">
      <div className="flex items-center gap-[14px]">
        <h1 className="sr-only">wevm</h1>
        <svg
          width="80"
          height="16"
          viewBox="0 0 311 63"
          fill="none"
          xmlns="https://www.w3.org/2000/svg"
          aria-hidden="true"
          className="block text-(--color-fg)"
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
        <Badge label="NPM DOWNLOADS" value={downloads} unit="/MO" />
        <Badge label="GH STARS" value={stars} unit="★" />
      </div>
    </header>
  )
}

function Badge({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="font-mono inline-flex items-center gap-2 border border-dashed border-(--color-border) bg-(--color-panel) px-2 py-1 text-[11px] uppercase leading-none tracking-[0.04em] text-(--color-fg) tabular-nums whitespace-nowrap">
      <span className="inline-flex items-center gap-1 text-(--color-fg-muted)">{label}</span>
      <span className="inline-flex items-baseline gap-1">
        <span>{value}</span>
        <span className="text-(--color-fg-muted)">{unit}</span>
      </span>
    </div>
  )
}

function Hero() {
  return (
    <section className="mb-10 grid grid-cols-1 gap-6">
      <div>
        <div className="text-[clamp(32px,6vw,64px)] font-bold leading-none tracking-[-0.03em]">
          TypeScript tooling for
          <br />
          the{' '}
          <i className="font-serif font-normal italic tracking-[-0.015em] px-[0.04em]">
            emerging
          </i>{' '}
          web
        </div>
        <p className="mt-[18px] max-w-[56ch] text-[clamp(16px,1.6vw,19px)] text-(--color-fg-muted)">
          <strong className="text-(--color-fg) font-bold">wevm</strong> is a small collective
          building open-source software used by hundreds of enterprise organizations and millions of
          developers worldwide.
        </p>
        <div className="mt-6 flex flex-wrap gap-[10px]">
          <Btn href="https://github.com/wevm">
            GitHub <span className="font-mono">→</span>
          </Btn>
          <Btn href="https://github.com/sponsors/wevm">
            Sponsor <span className="font-mono">→</span>
          </Btn>
          <Btn href="mailto:dev@wevm.dev">dev@wevm.dev</Btn>
        </div>
        <UsedBy />
      </div>
    </section>
  )
}

function Btn({ href, children }: { href: string; children: React.ReactNode }) {
  const external = !href.startsWith('mailto:')
  return (
    <a
      className="inline-flex items-center gap-2 border border-(--color-border) bg-(--color-panel) px-[14px] py-2 text-sm text-(--color-fg) no-underline transition-colors duration-100 hover:bg-(--color-fg) hover:text-(--color-bg)"
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  )
}

function UsedBy() {
  const logos: Array<{ label: string; svg: React.ReactNode }> = [
    {
      label: 'Acme',
      svg: (
        <>
          <circle cx="14" cy="16" r="8" fill="currentColor" />
          <text
            x="30"
            y="22"
            fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
            fontSize="16"
            fontWeight="700"
            letterSpacing="-0.02em"
            fill="currentColor"
          >
            Acme
          </text>
        </>
      ),
    },
    {
      label: 'Globex',
      svg: (
        <>
          <rect
            x="6"
            y="8"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <text
            x="30"
            y="22"
            fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
            fontSize="16"
            fontWeight="500"
            letterSpacing="0.02em"
            fill="currentColor"
          >
            Globex
          </text>
        </>
      ),
    },
    {
      label: 'Initech',
      svg: (
        <>
          <path d="M4 24 L14 8 L24 24 Z" fill="currentColor" />
          <text
            x="30"
            y="22"
            fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
            fontSize="15"
            fontWeight="700"
            letterSpacing="-0.01em"
            fill="currentColor"
          >
            Initech
          </text>
        </>
      ),
    },
    {
      label: 'Hooli',
      svg: (
        <text
          x="0"
          y="22"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="20"
          fontWeight="900"
          letterSpacing="-0.04em"
          fill="currentColor"
        >
          hooli
        </text>
      ),
    },
  ]
  return (
    <div className="mt-7 flex flex-col gap-4">
      <div className="text-lg font-medium tracking-[-0.01em] text-(--color-fg)">
        Trusted in production by
      </div>
      <ul className="m-0 flex list-none flex-wrap items-center gap-x-7 gap-y-3.5 p-0 text-(--color-fg)">
        {logos.map(({ label, svg }) => (
          <li
            key={label}
            className="inline-flex items-center opacity-70 transition-opacity duration-100 hover:opacity-100"
          >
            <svg
              className="block h-[22px] w-auto text-(--color-fg)"
              viewBox="0 0 130 32"
              aria-label={label}
            >
              {svg}
            </svg>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9 border-t border-(--color-border) pt-7">
      <div className="mb-5 flex items-baseline justify-between gap-3">
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
}

function Items({ items, collab }: { items: Array<Item>; collab?: boolean }) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-0 p-0">
      {items.map((it, i) => (
        <li
          key={i}
          className="grid items-baseline gap-5 border-b border-dotted border-(--color-border-soft) py-3.5 last:border-b-0 grid-cols-[minmax(220px,240px)_1fr] max-[640px]:grid-cols-1 max-[640px]:gap-1"
        >
          <div
            className={
              collab
                ? 'grid grid-cols-[80px_1fr] items-baseline gap-2.5 text-lg font-medium tracking-[-0.01em]'
                : 'text-lg font-medium tracking-[-0.01em]'
            }
          >
            <a href={it.href} target="_blank" rel="noopener noreferrer">
              {it.name}
            </a>
            {it.meta && (
              <span className="text-sm font-normal text-(--color-fg-muted)">{it.meta}</span>
            )}
          </div>
          <div className="text-[15px] text-(--color-fg-muted)">{it.desc}</div>
        </li>
      ))}
    </ul>
  )
}

function CoreProjects() {
  const items: Array<Item> = [
    {
      name: 'Viem',
      href: 'https://viem.sh',
      desc: 'TypeScript Interface for Ethereum.',
    },
    {
      name: 'Wagmi',
      href: 'https://wagmi.sh',
      desc: 'Reactivity for Ethereum apps.',
    },
    {
      name: 'Ox',
      href: 'https://oxlib.sh',
      desc: 'Standard Library for Ethereum.',
    },
    {
      name: 'ABIType',
      href: 'https://abitype.dev',
      desc: 'Strict TypeScript types for Ethereum ABIs.',
    },
    {
      name: 'Vocs',
      href: 'https://vocs.dev',
      desc: 'Minimal Documentation Framework, powered by React + Vite.',
    },
    {
      name: 'Prool',
      href: 'https://github.com/wevm/prool',
      desc: 'HTTP testing instances for Ethereum.',
    },
  ]
  return (
    <Section title="Core Projects">
      <Items items={items} />
    </Section>
  )
}

function Collaborations() {
  const collab = (label: string, href: string) => (
    <>
      with{' '}
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </>
  )
  const items: Array<Item> = [
    {
      name: 'mppx',
      href: 'https://github.com/wevm/mppx',
      meta: collab('Tempo', 'https://tempo.xyz'),
      desc: 'TypeScript Interface for Machine Payments Protocol.',
    },
    {
      name: 'Accounts',
      href: 'https://github.com/tempoxyz/accounts',
      meta: collab('Tempo', 'https://tempo.xyz'),
      desc: 'Account abstraction primitives.',
    },
    {
      name: 'Porto',
      href: 'https://github.com/ithacaxyz/porto',
      meta: collab('Ithaca', 'https://ithaca.xyz'),
      desc: 'Next-gen Account for Ethereum.',
    },
    {
      name: 'Frog',
      href: 'https://github.com/wevm/frog',
      meta: collab('Paradigm', 'https://paradigm.xyz'),
      desc: 'Framework for Farcaster Frames 🐸',
    },
    {
      name: 'Rivet',
      href: 'https://github.com/paradigmxyz/rivet',
      meta: collab('Paradigm', 'https://paradigm.xyz'),
      desc: 'Developer Wallet & DevTools for Anvil.',
    },
  ]
  return (
    <Section title="Collaborations">
      <Items items={items} collab />
    </Section>
  )
}

function Team() {
  const items: Array<Item> = [
    {
      name: 'tmm',
      href: 'https://github.com/tmm',
      desc: (
        <>
          <a href="https://github.com/tmm" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          ,{' '}
          <a href="https://x.com/awkweb" target="_blank" rel="noopener noreferrer">
            Twitter
          </a>
        </>
      ),
    },
    {
      name: 'jxom',
      href: 'https://github.com/jxom',
      desc: (
        <>
          <a href="https://github.com/jxom" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          ,{' '}
          <a href="https://x.com/_jxom" target="_blank" rel="noopener noreferrer">
            Twitter
          </a>
        </>
      ),
    },
  ]
  return (
    <Section title="Team">
      <Items items={items} />
    </Section>
  )
}

type Sponsor = { name: string; href: string; svg: React.ReactNode }

const SPONSORS: Array<Sponsor> = [
  {
    name: 'Paradigm',
    href: 'https://paradigm.xyz',
    svg: (
      <svg viewBox="0 0 200 32" className="block h-[22px] w-auto text-(--color-fg)">
        <path d="M16 4 L28 16 L16 28 L4 16 Z" fill="currentColor" />
        <text
          x="38"
          y="23"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="20"
          fontWeight="700"
          letterSpacing="0.14em"
          fill="currentColor"
        >
          PARADIGM
        </text>
      </svg>
    ),
  },
  {
    name: 'Tempo',
    href: 'https://tempo.xyz',
    svg: (
      <svg viewBox="0 0 130 32" className="block h-[22px] w-auto text-(--color-fg)">
        <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="2.5" fill="currentColor" />
        <text
          x="36"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="500"
          letterSpacing="-0.02em"
          fill="currentColor"
        >
          tempo
        </text>
      </svg>
    ),
  },
  {
    name: 'Stripe',
    href: 'https://stripe.com',
    svg: (
      <svg viewBox="0 0 110 32" className="block h-[22px] w-auto text-(--color-fg)">
        <text
          x="0"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="700"
          letterSpacing="-0.03em"
          fill="currentColor"
        >
          stripe
        </text>
      </svg>
    ),
  },
  {
    name: 'Polymarket',
    href: 'https://polymarket.com',
    svg: (
      <svg viewBox="0 0 180 32" className="block h-[22px] w-auto text-(--color-fg)">
        <rect x="2" y="6" width="20" height="20" fill="currentColor" />
        <text
          x="30"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="500"
          letterSpacing="-0.01em"
          fill="currentColor"
        >
          Polymarket
        </text>
      </svg>
    ),
  },
  {
    name: 'Privy',
    href: 'https://privy.io',
    svg: (
      <svg viewBox="0 0 90 32" className="block h-[22px] w-auto text-(--color-fg)">
        <text
          x="0"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="700"
          letterSpacing="-0.04em"
          fill="currentColor"
        >
          Privy
        </text>
      </svg>
    ),
  },
  {
    name: 'Family',
    href: 'https://family.co',
    svg: (
      <svg viewBox="0 0 110 32" className="block h-[22px] w-auto text-(--color-fg)">
        <text
          x="0"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="500"
          letterSpacing="0.02em"
          fill="currentColor"
        >
          Family
        </text>
      </svg>
    ),
  },
  {
    name: 'Zora',
    href: 'https://zora.co',
    svg: (
      <svg viewBox="0 0 110 32" className="block h-[22px] w-auto text-(--color-fg)">
        <circle cx="14" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
        <text
          x="32"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="700"
          letterSpacing="-0.02em"
          fill="currentColor"
        >
          Zora
        </text>
      </svg>
    ),
  },
  {
    name: 'Dynamic',
    href: 'https://dynamic.xyz',
    svg: (
      <svg viewBox="0 0 130 32" className="block h-[22px] w-auto text-(--color-fg)">
        <text
          x="0"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="500"
          letterSpacing="-0.01em"
          fill="currentColor"
        >
          dynamic
        </text>
      </svg>
    ),
  },
  {
    name: 'Context',
    href: 'https://context.app',
    svg: (
      <svg viewBox="0 0 130 32" className="block h-[22px] w-auto text-(--color-fg)">
        <text
          x="0"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="500"
          letterSpacing="0.02em"
          fill="currentColor"
        >
          Context
        </text>
      </svg>
    ),
  },
  {
    name: 'Sushi',
    href: 'https://sushi.com',
    svg: (
      <svg viewBox="0 0 110 32" className="block h-[22px] w-auto text-(--color-fg)">
        <text
          x="0"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="700"
          letterSpacing="-0.02em"
          fill="currentColor"
        >
          SUSHI
        </text>
      </svg>
    ),
  },
  {
    name: 'PancakeSwap',
    href: 'https://pancakeswap.finance',
    svg: (
      <svg viewBox="0 0 170 32" className="block h-[22px] w-auto text-(--color-fg)">
        <text
          x="0"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="700"
          letterSpacing="-0.01em"
          fill="currentColor"
        >
          PancakeSwap
        </text>
      </svg>
    ),
  },
  {
    name: 'Pimlico',
    href: 'https://pimlico.io',
    svg: (
      <svg viewBox="0 0 120 32" className="block h-[22px] w-auto text-(--color-fg)">
        <text
          x="0"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="500"
          letterSpacing="0.01em"
          fill="currentColor"
        >
          pimlico
        </text>
      </svg>
    ),
  },
  {
    name: 'Syndicate',
    href: 'https://syndicate.io',
    svg: (
      <svg viewBox="0 0 140 32" className="block h-[22px] w-auto text-(--color-fg)">
        <text
          x="0"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="500"
          letterSpacing="-0.01em"
          fill="currentColor"
        >
          Syndicate
        </text>
      </svg>
    ),
  },
  {
    name: 'Relay',
    href: 'https://relay.link',
    svg: (
      <svg viewBox="0 0 100 32" className="block h-[22px] w-auto text-(--color-fg)">
        <text
          x="0"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="700"
          letterSpacing="-0.02em"
          fill="currentColor"
        >
          Relay
        </text>
      </svg>
    ),
  },
  {
    name: 'Web3Auth',
    href: 'https://web3auth.io',
    svg: (
      <svg viewBox="0 0 130 32" className="block h-[22px] w-auto text-(--color-fg)">
        <text
          x="0"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="500"
          letterSpacing="0.01em"
          fill="currentColor"
        >
          Web3Auth
        </text>
      </svg>
    ),
  },
  {
    name: 'Sequence',
    href: 'https://sequence.xyz',
    svg: (
      <svg viewBox="0 0 140 32" className="block h-[22px] w-auto text-(--color-fg)">
        <text
          x="0"
          y="24"
          fontFamily="Helvetica Now Display, Helvetica, Arial, sans-serif"
          fontSize="22"
          fontWeight="500"
          letterSpacing="-0.01em"
          fill="currentColor"
        >
          Sequence
        </text>
      </svg>
    ),
  },
]

function Sponsors() {
  return (
    <Section title="Sponsors">
      <p className="mb-7 text-(--color-fg-muted)">
        Want to support our work or collaborate?{' '}
        <a href="https://github.com/sponsors/wevm" target="_blank" rel="noopener noreferrer">
          Become a sponsor
        </a>
        .
      </p>
      <ul className="m-0 grid list-none grid-cols-4 gap-x-6 gap-y-7 p-0 max-[640px]:grid-cols-2">
        {SPONSORS.map((s) => (
          <li key={s.name} className="flex min-h-6 items-center justify-start">
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.name}
              className="inline-flex items-center no-underline opacity-75 transition-opacity duration-100 hover:opacity-100"
            >
              {s.svg}
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Footer({ year }: { year: number }) {
  return (
    <footer className="mt-12 flex flex-wrap justify-between gap-3 border-t border-(--color-border) pt-5 font-mono text-[11px] uppercase tracking-[0.04em] text-(--color-fg-muted)">
      <div>
        <strong className="font-normal text-(--color-fg)">weth, LLC</strong> — trading as{' '}
        <strong className="font-normal text-(--color-fg)">wevm</strong>
      </div>
      <div>© 2023–{year}</div>
    </footer>
  )
}
