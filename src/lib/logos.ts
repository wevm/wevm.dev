/**
 * Build-time-bundled mono brand-mark SVGs, indexed by slug.
 *
 * The mono SVG files in `public/logos/mono/` are generated as
 * `<mask> + <rect fill="white" mask="url(#m)">` documents. Rendering
 * those as `<img src="*.svg">` (with `filter` recolor) or as a CSS
 * `mask-image` causes blur on iOS Safari — Safari rasterizes masked
 * SVG images at 1× device pixels in both paths.
 *
 * Solution: inline the SVG as live DOM and recolor via `currentColor`.
 * Vite resolves `?raw` imports at build time, so the bytes ship in
 * the bundle without a runtime fetch.
 */
const sources = import.meta.glob<string>('../../public/logos/mono/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const bySlug: Record<string, string> = Object.fromEntries(
  Object.entries(sources).map(([path, raw]) => {
    const slug = path.match(/\/([^/]+)\.svg$/)?.[1] ?? ''
    return [slug, raw]
  }),
)

/**
 * Return the SVG markup for `slug` rewired for inline rendering:
 *
 * 1. Swap the painted `<rect>`'s `fill="white"` for `fill="currentColor"`
 *    so the mark inherits the host element's CSS color.
 * 2. Namespace the internal `id="m"` mask reference per instance so
 *    multiple inlined logos don't collide on a shared id.
 *
 * Returns `undefined` when the slug isn't in the manifest.
 */
export function get(slug: string, instanceId: string): string | undefined {
  const raw = bySlug[slug]
  if (!raw) return undefined
  const id = `m-${slug}-${instanceId}`
  return raw
    .replace(
      /(<rect\b[^>]*?)\bfill="white"(\s+mask="url\(#m\)")/,
      `$1fill="currentColor"$2`,
    )
    .replace(/\bid="m"/, `id="${id}"`)
    .replace(/mask="url\(#m\)"/, `mask="url(#${id})"`)
}
