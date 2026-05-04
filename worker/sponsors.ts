import { Hono } from 'hono'
import logoManifestJson from '../public/logos/manifest.json' with { type: 'json' }
import config from '../wevm.config'
import * as Kv from './lib/kv.js'

const manifest = logoManifestJson as Record<string, number>
const logoOverrides = Object.fromEntries(
  Object.entries((config.logoOverrides as Record<string, { scale?: number }>) ?? {}).map(
    ([k, v]) => [k.toLowerCase(), v],
  ),
)

/**
 * Mono SVG bytes for every committed logo, bundled at build time
 * via Vite's `?raw` glob. Keyed by absolute glob path (looked up
 * with `` `../public/logos/mono/${slug}.svg` `` at the call site)
 * so each sponsor's mark inlines into the composite without a
 * runtime asset fetch.
 */
const sources = import.meta.glob<string>('../public/logos/mono/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/**
 * Hono sub-app exposing the `/sponsors.{ext}` image route. Mounted
 * on the parent app in {@link ./app.ts}; unmatched requests fall
 * through to the TanStack Start handler via the parent's `notFound`.
 *
 * Currently SVG-only:
 *
 * - `GET /sponsors.svg` — always serves SVG.
 * - `GET /sponsors`     — serves SVG when `Accept` includes
 *                         `image/svg+xml` (or `image/*`); otherwise
 *                         falls through to TanStack (404 today).
 *
 * Query params (both routes):
 *
 * - `w` / `h` — `w` sets the canvas width (default `1200`); `h`
 *   (default `630`) only steers the column-count heuristic so the
 *   grid roughly matches that aspect. The output viewBox always
 *   shrink-wraps the actual rendered rows.
 * - `scheme` — `'light'` (default, black ink — readable on light
 *   backgrounds) or `'dark'` (white ink — readable on dark
 *   backgrounds). The container background is always transparent.
 *
 * Composition: every logo renders at the same height (and
 * proportional width), centered in a uniform grid cell. Each mono
 * source is recoloured by swapping its visible
 * `<rect fill="white" mask=…>` to the scheme's ink and embedded
 * via `<image href="data:image/svg+xml;base64,…">` so per-source
 * ID spaces (`m`, `a`, `b`, …) stay isolated from peers.
 */
export const app = new Hono<{ Bindings: Cloudflare.Env }>().on(
  'GET',
  ['/sponsors', '/sponsors.svg'],
  async (c, next) => {
    // `/sponsors.svg` is unconditional; bare `/sponsors` only
    // serves SVG when the client explicitly asks for an image.
    if (!c.req.path.endsWith('.svg')) {
      const accept = c.req.header('Accept') ?? ''
      if (!accept.includes('image/svg+xml') && !accept.includes('image/*')) return next()
    }
    const width = Number(c.req.query('w')) || 1200
    const height = Number(c.req.query('h')) || 630
    const ink = c.req.query('scheme') === 'dark' ? '#f5f5f3' : '#0c0c0c'
    const sponsors = (await Kv.from(c.env.KV).get('sponsors')) ?? []
    // Drop sponsors with no committed logo — UI shows text fallback,
    // but a static image has no good place for it.
    const items = sponsors.filter(
      (s) => sources[`../public/logos/mono/${s.login}.svg`] && manifest[s.login],
    )
    const svg = (() => {
      if (items.length === 0)
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"/>`
      // Pick a column count whose cell aspect roughly matches the
      // canvas aspect — avoids tall narrow strips on wide canvases.
      const cols = Math.max(
        1,
        Math.min(items.length, Math.ceil(Math.sqrt((items.length * width) / height))),
      )
      const rows = Math.ceil(items.length / cols)
      const cellW = width / cols
      // Horizontal padding shrinks the per-cell render width;
      // vertical "padding" is computed as a small row gap so we
      // don't inherit the canvas's empty vertical space when the
      // grid only needs a few short rows.
      const padX = 0.05 * cellW
      const innerW = cellW - 2 * padX
      // Uniform render-height: the largest height at which every
      // logo also fits the cell width given its own aspect ratio.
      const maxRatio = items.reduce((m, s) => Math.max(m, manifest[s.login]!), 0)
      const logoH = innerW / maxRatio
      const rowGap = logoH * 1.5
      // Bleed budget for any logo whose `logoOverrides.scale > 1`
      // — without padding the canvas top/bottom, a 1.5× mark on
      // the first/last row would clip outside the viewBox.
      const maxScale = items.reduce((m, s) => Math.max(m, logoOverrides[s.login]?.scale ?? 1), 1)
      const bleed = ((maxScale - 1) / 2) * logoH
      // Output viewBox tracks actual rendered content — `?h` only
      // shapes the column-count heuristic above, never empty space.
      const outH = rows * logoH + (rows - 1) * rowGap + 2 * bleed
      const children = items
        .map((s, i) => {
          const row = Math.floor(i / cols)
          const col = i % cols
          // Per-slug optical scale lets brands with thin marks (e.g.
          // Paradigm) read at the same visual weight as wider
          // wordmarks without distorting the global grid.
          const scale = logoOverrides[s.login]?.scale ?? 1
          const h = logoH * scale
          const w = h * manifest[s.login]!
          const x = col * cellW + (cellW - w) / 2
          // Centre each logo on its row's mid-line so scaled-up
          // marks grow symmetrically rather than dropping below.
          const y = bleed + row * (logoH + rowGap) + (logoH - h) / 2
          const recoloured = sources[`../public/logos/mono/${s.login}.svg`]!.replace(
            'fill="white" mask="url(#m)"',
            `fill="${ink}" mask="url(#m)"`,
          )
          const href = `data:image/svg+xml;base64,${btoa(recoloured)}`
          return `<image x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" href="${href}"/>`
        })
        .join('')
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${outH.toFixed(2)}" width="${width}" height="${outH.toFixed(2)}">${children}</svg>`
    })()
    return c.body(svg, 200, {
      'cache-control': 'public, max-age=300, s-maxage=300',
      'content-type': 'image/svg+xml; charset=utf-8',
    })
  },
)
