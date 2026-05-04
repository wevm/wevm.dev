import { Resvg } from '@resvg/resvg-js'
import { optimize } from 'svgo'
import { parse, stringify } from 'svgson'

/**
 * Final canvas height in viewBox units. Matches the marquee's 22 px
 * render so 1 viewBox unit ≈ 1 rendered pixel at the most common
 * size. Width per logo is computed from the optical-aspect ratio.
 */
const canvasHeight = 22

/**
 * Fraction of the canvas height the logo's optical content fills at
 * `scale: 1`. `1` means the optical bbox spans the entire canvas with
 * zero padding — every brand mark butts up against its own dimension
 * box. The marquee's `gap-x-10` (and the Sponsors grid's `gap-x-6`)
 * supplies inter-logo whitespace; the SVG itself shouldn't carry any.
 */
const opticalRatio = 1

/**
 * Horizontal breathing-room around the optical bbox, expressed as a
 * fraction of the *canvas height*. `0` because the logo box should
 * be tight to the ink — see {@link opticalRatio}.
 */
const sidePad = 0

/**
 * Resvg render height when measuring the optical alpha bbox. Higher
 * values give sub-source-unit precision; 256 px is a good balance —
 * enough to nail the bbox to within ~0.4 % even on a 64 px-tall
 * source viewBox, while keeping the producer-side measurement cost
 * negligible.
 */
const measureHeight = 256

/**
 * Normalize one source SVG into a single-ink, optically-aligned mark
 * with cutouts preserved (so e.g. opensea's boat and brave's lion
 * face don't disappear into a solid silhouette).
 *
 * Pipeline:
 *   1. SVGO cleanup (strip metadata, comments, editor cruft, etc.)
 *   2. Resolve class-based paint (`<style>.st1{fill:#fff}</style>` +
 *      `class="st1"`) into inline `fill`/`stroke` attributes — SVGO's
 *      `inlineStyles` doesn't fire on the multi-class artwork our
 *      sources tend to ship with.
 *   3. Mono-mask via {@link monoize}: every paint becomes either
 *      `white` (ink → opaque in the mask) or `black` (cutout: was
 *      pure white in the source → transparent in the mask), with
 *      `none` preserved. Gradients/patterns/styles are dropped.
 *   4. Rasterize via `@resvg/resvg-js` with the mono-mask wrapped
 *      around a rect, and compute the alpha bbox — this is the
 *      *optical* extent of ink (excluding cutouts), ignoring the
 *      source viewBox's (often loose) bounding-box padding.
 *   5. Re-target the viewBox so the optical bbox fills
 *      `opticalRatio` of the canvas height, with horizontal
 *      breathing room of `sidePad` units. Width auto-derives so the
 *      optical aspect ratio is preserved.
 *   6. Wrap the same monoized children in a `<mask>` + `<rect>`
 *      painted pure white. The page recolors at render time via CSS
 *      `filter` so the bytes carry no opinion about the page palette
 *      — same SVG works in light, dark, or any inverted theme.
 *
 * Per-slug visual scale (from `wevm.config.ts.logoOverrides`) is
 * applied client-side via CSS `transform: scale()` in `Mark` —
 * keeping the SVG bytes purely structural.
 *
 * Returns a self-contained SVG string. The `viewBox` reflects the
 * canonical canvas (height = 22), so callers get an aspect ratio
 * that already accounts for normalization.
 *
 * Throws on unparseable input — the producer in `Sync.runLogos`
 * catches per-slug so a single bad source doesn't sink the run.
 */
export async function transform(
  svg: string,
  options: transform.Options = {},
): Promise<string> {
  const { mode = 'mono' } = options
  const optimized = optimize(svg, {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            // keep ids around; we look them up on `<use href>` etc.
            cleanupIds: { remove: false, minify: true },
          },
        },
      },
      'removeDimensions',
    ],
  }).data

  const ast = await parse(optimized)
  // 1) lift class-based fills out of <style> blocks onto each element
  //    so step (2) only has to consider element-local paint.
  const classFills = collectClassFills(ast)
  applyClassFills(ast, classFills)
  // Snapshot the colored, normalized SVG before monoize destroys colors —
  // `mode: 'color'` re-uses these bytes verbatim inside the final viewBox.
  const coloredSvg = stringify(ast)
  const sourceBox = parseViewBox(coloredSvg)
  if (!sourceBox) throw new Error('viewBox parse failed')
  const coloredInner = coloredSvg.replace(/^<svg\b[^>]*>/i, '').replace(/<\/svg>\s*$/i, '')

  // 2) decide — geometrically — whether white-fill paths are cutouts
  //    inside a colored silhouette (opensea boat, brave lion face)
  //    or standalone ink (thirdweb's dark-mode wordmark, paradigm's
  //    white wordmark next to its green icon). See {@link detectCutoutWhite}.
  const whiteIsCutout = detectCutoutWhite(coloredSvg)
  // 3) rewrite every paint to white (ink) / black (cutout) / none.
  //    Always run, even for `mode: 'color'` — the mono mask is the input
  //    to the optical-bbox measurement that drives viewBox re-targeting.
  monoize(ast, whiteIsCutout)
  const monoSvg = stringify(ast)
  const monoInner = monoSvg.replace(/^<svg\b[^>]*>/i, '').replace(/<\/svg>\s*$/i, '')

  // Measure the alpha bbox of the masked rect — that's the silhouette
  // with cutouts knocked out, which is what the user actually sees.
  const probe = wrapMask({ inner: monoInner, sourceBox, color: 'black', dims: `viewBox="${sourceBox.x} ${sourceBox.y} ${sourceBox.width} ${sourceBox.height}"` })
  const resvg = new Resvg(probe, {
    fitTo: { mode: 'height', value: measureHeight },
    background: 'rgba(255,255,255,0)',
  })
  const rendered = resvg.render()
  const pxBox = alphaBbox(rendered.pixels, rendered.width, rendered.height)
  if (!pxBox) throw new Error('rasterized SVG has no opaque pixels')

  // px → source-unit coords, then drop into `opticalRatio × scale` band
  const k = sourceBox.height / rendered.height
  const optical = {
    x: sourceBox.x + pxBox.x * k,
    y: sourceBox.y + pxBox.y * k,
    width: pxBox.width * k,
    height: pxBox.height * k,
  }
  const finalHeight = optical.height / opticalRatio
  const padY = (finalHeight - optical.height) / 2
  const padX = finalHeight * sidePad

  const finalBox = {
    x: optical.x - padX,
    y: optical.y - padY,
    width: optical.width + 2 * padX,
    height: optical.height + 2 * padY,
  }

  // canonical canvas: height = `canvasHeight`, width preserves optical aspect
  const ratio = finalBox.width / finalBox.height
  const finalWidth = canvasHeight * ratio
  const dims = `viewBox="${finalBox.x} ${finalBox.y} ${finalBox.width} ${finalBox.height}" width="${finalWidth}" height="${canvasHeight}"`

  if (mode === 'mono') return wrapMask({ inner: monoInner, sourceBox, color: 'white', dims })
  // `mode: 'color'` — emit the (colored, normalized) inner inside the
  // final viewBox. No mask, no `currentColor` recolor — bytes carry the
  // brand's native palette so the page can render them as-is.
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${dims}>${coloredInner}</svg>`
}
export declare namespace transform {
  type Options = {
    /**
     * `'mono'` (default) — flatten every paint to a `currentColor` mask
     * with cutouts preserved (page recolors via CSS `filter`).
     * `'color'` — preserve the brand's native palette while applying the
     * same SVGO cleanup + viewBox re-targeting as `'mono'`.
     */
    mode?: 'mono' | 'color'
  }
}



/**
 * Walk the SVG AST and rewrite every paint to the mono-mask palette:
 *
 * - Element-level `fill` / `stroke` attributes:
 *     - `none` / `transparent` → kept as `none` (no rendering, no
 *       cutout). Stroke-only paths stay hollow.
 *     - pure white (`#fff`, `#ffffff`, `white`, `rgb(255,255,255)`)
 *       → `black`. In the outer `<mask>`, black is transparent —
 *       so original-white regions become cutouts in the rendered
 *       silhouette (preserving e.g. opensea's boat negative space).
 *     - everything else (colors, gradient refs, `currentColor`,
 *       missing) → `white`. White in the mask is opaque, so these
 *       regions are painted with the rect's `currentColor`.
 * - Inline `style="..."` attribute: same treatment, parsed as a
 *   semicolon list.
 * - `<linearGradient>` / `<radialGradient>` / `<pattern>` defs are
 *   dropped — every `fill="url(#…)"` was just rewritten to `white`,
 *   so the defs are unreferenced.
 * - `<style>` element contents are dropped — class-based fills were
 *   already lifted onto each element by {@link applyClassFills}.
 * - `class` attributes are dropped for the same reason.
 *
 * Mutates `node` in place. Inheritance via ancestor `<g fill="…">`
 * happens naturally: rewriting the group's `fill` to `white` means
 * unfilled children inherit `white` (ink), and rewriting it to
 * `black` makes them inherit `black` (cutout).
 */
function monoize(node: Node, whiteIsCutout: boolean): void {
  if (!node.children) node.children = []

  // drop gradient / pattern / style defs whose paint is no longer needed
  node.children = node.children.filter((c) => {
    if (c.name === 'linearGradient') return false
    if (c.name === 'radialGradient') return false
    if (c.name === 'pattern') return false
    if (c.name === 'style') return false
    return true
  })

  if (node.attributes) {
    if ('fill' in node.attributes)
      node.attributes.fill = paintColor(classifyPaint(node.attributes.fill, whiteIsCutout))
    if ('stroke' in node.attributes)
      node.attributes.stroke = paintColor(classifyPaint(node.attributes.stroke, whiteIsCutout))
    if ('style' in node.attributes) {
      const rewritten = monoStyle(node.attributes.style, whiteIsCutout)
      if (rewritten) node.attributes.style = rewritten
      else delete node.attributes.style
    }
    delete node.attributes.class
  }

  for (const child of node.children) monoize(child, whiteIsCutout)
}

/**
 * Three modes a paint value can fall into:
 *
 * - `ink` — render as opaque ink (gets `white` in the mask).
 * - `cutout` — was pure white; render as transparent (gets `black`
 *   in the mask, so it's a knock-out of any underlying ink).
 * - `none` — no rendering at all (kept as `none`).
 */
type PaintMode = 'ink' | 'cutout' | 'none'

function classifyPaint(value: string | undefined, whiteIsCutout: boolean): PaintMode {
  if (value === undefined) return 'ink'
  const v = value.trim().toLowerCase()
  if (v === '' || v === 'none' || v === 'transparent') return 'none'
  if (isWhite(v)) return whiteIsCutout ? 'cutout' : 'ink'
  return 'ink'
}

/**
 * Decide whether to treat white-fill paths as cutouts (knock-outs of
 * the colored silhouette they sit inside, e.g. opensea's boat or
 * brave's lion face) or as standalone ink (e.g. thirdweb's
 * dark-mode wordmark, or paradigm's white wordmark sitting next to
 * a green icon).
 *
 * Pure attribute introspection ("any non-white paint anywhere?")
 * gets paradigm wrong — the green icon flags the document as
 * "colored", but the white wordmark isn't inside the icon, it's
 * beside it. So we render the source with native colors and check
 * geometrically:
 *
 *   - no colored opaque pixels → all-white artwork → ink
 *     (thirdweb).
 *   - no white opaque pixels → no decision needed → false (cutout
 *     status doesn't matter; everything will be ink anyway).
 *   - white-pixel bbox doesn't overlap colored-pixel bbox → white
 *     is a separate region of the mark, not a cutout → ink
 *     (paradigm).
 *   - bboxes overlap → white sits inside (or alongside) the
 *     colored body and almost certainly represents negative space
 *     → cutout (opensea, brave).
 *
 * 128 px probe height is plenty for bbox accuracy on the brand
 * artwork sizes we care about; the comparison is robust to a
 * couple-pixel slop from anti-aliasing.
 */
function detectCutoutWhite(svg: string): boolean {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'height', value: 128 },
    background: 'rgba(0,0,0,0)',
  })
  const { pixels, width, height } = resvg.render()
  let colored: Box | null = null
  let white: Box | null = null
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const a = pixels[i + 3]!
      if (a === 0) continue
      // resvg-js returns RGBA premultiplied. A "real" white pixel is
      // (255,255,255,A) un-premultiplied → (A,A,A,A) premultiplied,
      // i.e. R/G/B all equal A within an anti-aliasing slop. Without
      // this awareness, edge pixels of nominally-white shapes (e.g.
      // thirdweb's wordmark glyphs at 25 % alpha → (64,64,64,64))
      // get misclassified as "colored", which then false-positives
      // the cutout-overlap detection and turns the entire all-white
      // mark into an empty mask.
      const slop = 5
      const isWhitePx =
        pixels[i]! >= a - slop && pixels[i + 1]! >= a - slop && pixels[i + 2]! >= a - slop
      if (isWhitePx) white = expandBox(white, x, y)
      else colored = expandBox(colored, x, y)
    }
  }
  if (!colored || !white) return false
  return boxesOverlap(white, colored)
}

type Box = { x0: number; y0: number; x1: number; y1: number }

function expandBox(b: Box | null, x: number, y: number): Box {
  if (!b) return { x0: x, y0: y, x1: x, y1: y }
  if (x < b.x0) b.x0 = x
  if (x > b.x1) b.x1 = x
  if (y < b.y0) b.y0 = y
  if (y > b.y1) b.y1 = y
  return b
}

function boxesOverlap(a: Box, b: Box): boolean {
  return a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0
}

function paintColor(mode: PaintMode): string {
  if (mode === 'none') return 'none'
  if (mode === 'cutout') return 'black'
  return 'white'
}

/**
 * True for the set of values browsers / resvg render as pure white.
 * The check is intentionally strict — only "pure" white counts as a
 * cutout, so off-white wordmarks (e.g. `#fafafa` text) still render
 * as ink instead of disappearing.
 */
function isWhite(value: string): boolean {
  const v = value.replace(/\s+/g, '')
  if (v === 'white' || v === '#fff' || v === '#ffffff' || v === '#ffff' || v === '#ffffffff')
    return true
  if (v === 'rgb(255,255,255)' || v === 'rgba(255,255,255,1)') return true
  return false
}

/**
 * Rewrite an inline `style="…"` value: keep non-paint declarations
 * untouched, classify any `fill`/`stroke` and emit the mono-mask
 * color. Returns `''` when the result is empty so the caller can
 * drop the attribute.
 */
function monoStyle(style: string, whiteIsCutout: boolean): string {
  const out: string[] = []
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':')
    if (idx < 0) continue
    const prop = decl.slice(0, idx).trim().toLowerCase()
    const value = decl.slice(idx + 1).trim()
    if (prop === 'fill' || prop === 'stroke')
      out.push(`${prop}:${paintColor(classifyPaint(value, whiteIsCutout))}`)
    else if (prop) out.push(`${prop}:${value}`)
  }
  return out.join(';')
}

/**
 * Walk `<style>` blocks and pull out per-class `fill` / `stroke`
 * declarations. Builds a `{ [className]: { fill, stroke } }` map the
 * caller (`applyClassFills`) uses to lift the rule onto each
 * `class="…"` element before we drop the `<style>` block in
 * {@link monoize}.
 *
 * Only handles bare `.classname { … }` selectors — that's what every
 * Adobe-Illustrator-exported SVG we encounter ships with.
 */
function collectClassFills(node: Node): Record<string, { fill?: string; stroke?: string }> {
  const out: Record<string, { fill?: string; stroke?: string }> = {}
  walk(node)
  return out

  function walk(n: Node): void {
    if (n.name === 'style') {
      const text = (n.children ?? [])
        .map((c) => (c as { type?: string; value?: string }).value ?? '')
        .join('')
      for (const m of text.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
        const cls = m[1]
        const body = m[2]
        if (!cls || !body) continue
        const entry = out[cls] ?? {}
        const fillM = body.match(/(?:^|[;\s])fill\s*:\s*([^;]+?)\s*(?:;|$)/i)
        const strokeM = body.match(/(?:^|[;\s])stroke\s*:\s*([^;]+?)\s*(?:;|$)/i)
        if (fillM?.[1]) entry.fill = fillM[1]
        if (strokeM?.[1]) entry.stroke = strokeM[1]
        out[cls] = entry
      }
    }
    for (const child of n.children ?? []) walk(child)
  }
}

/**
 * For each element with a `class="…"` attribute, look up the matching
 * rule from {@link collectClassFills} and set inline `fill` / `stroke`
 * — but only when the element doesn't already have an explicit value
 * (a presentation attribute or an inline `style` declaration always
 * wins over CSS-class paint).
 */
function applyClassFills(
  node: Node,
  classFills: Record<string, { fill?: string; stroke?: string }>,
): void {
  if (node.attributes?.class) {
    for (const cls of node.attributes.class.split(/\s+/)) {
      const entry = classFills[cls]
      if (!entry) continue
      const style = node.attributes.style ?? ''
      if (entry.fill && !node.attributes.fill && !hasStyleProp(style, 'fill'))
        node.attributes.fill = entry.fill
      if (entry.stroke && !node.attributes.stroke && !hasStyleProp(style, 'stroke'))
        node.attributes.stroke = entry.stroke
    }
  }
  for (const child of node.children ?? []) applyClassFills(child, classFills)
}

/** True if an inline `style` string declares the given property. */
function hasStyleProp(style: string, prop: string): boolean {
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':')
    if (idx < 0) continue
    if (decl.slice(0, idx).trim().toLowerCase() === prop) return true
  }
  return false
}

/** Minimal AST node shape we touch — `svgson`'s `INode`. */
type Node = {
  name?: string
  attributes?: Record<string, string>
  children?: Node[]
}

/**
 * Pull `viewBox="x y w h"` out of an SVG string. Used here (not the
 * shared `viewbox.ts`) because we need the floats, not just the
 * width/height pair.
 */
function parseViewBox(svg: string): { x: number; y: number; width: number; height: number } | null {
  const match = svg.match(/viewBox\s*=\s*["']\s*([\d.\-eE]+)\s+([\d.\-eE]+)\s+([\d.\-eE]+)\s+([\d.\-eE]+)\s*["']/)
  if (!match) return null
  const [, x, y, w, h] = match
  return { x: +x!, y: +y!, width: +w!, height: +h! }
}

/**
 * Tight alpha bounding box of an RGBA pixel buffer. Iterates rows /
 * columns from each edge inward until it hits an opaque pixel; this
 * is O(W × H) worst case but on a 256 px-tall raster that's ~30 K
 * pixels — well below 1 ms even on cold-start.
 */
function alphaBbox(
  pixels: Uint8Array,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } | null {
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // RGBA — index 3 of each 4-byte pixel is alpha
      if (pixels[(y * width + x) * 4 + 3]! === 0) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return null
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

/**
 * Wrap the monoized inner content in a `<mask>` and apply it to a
 * `<rect>` covering the source viewBox. Used twice per `transform`
 * call:
 *
 * - **measurement** (`color: 'black'`, `dims = source viewBox`):
 *   rasterized to find the optical alpha bbox.
 * - **final emit** (`color: 'white'`, `dims = canonical canvas`):
 *   the served bytes — pure white ink so the page can recolor via
 *   CSS `filter` (or `mask-image`, etc.) without the SVG document
 *   carrying its own opinion.
 *
 * `maskUnits="userSpaceOnUse"` + explicit x/y/w/h pegs the mask to
 * the source coordinate system, so the rect (also in source coords)
 * is masked exactly where original ink existed (and knocked out
 * where original-white cutouts existed).
 *
 * `xmlns:xlink` is harmless when no `<use xlink:href>` exists, but
 * strictly required when one does — brave's wordmark uses it for
 * `<defs>` reuse.
 */
function wrapMask(options: {
  inner: string
  sourceBox: { x: number; y: number; width: number; height: number }
  color: string
  dims: string
}): string {
  const { inner, sourceBox, color, dims } = options
  const region = `x="${sourceBox.x}" y="${sourceBox.y}" width="${sourceBox.width}" height="${sourceBox.height}"`
  // `fill="white"` on the mask itself: children that came in with no
  // explicit `fill` (e.g. thirdweb's source has `<svg fill="none">`
  // at the root, so its child paths inherited "none" — invisible —
  // before we stripped the wrapper) inherit white = opaque ink in
  // the mask. Existing intermediate `<g fill="…">` ancestors still
  // win via normal SVG cascade, so this is a safe default, not an
  // override. We deliberately don't set `stroke` here — that would
  // paint a 1 px ink outline around every previously stroke-less
  // shape.
  const mask = `<mask id="m" fill="white" maskUnits="userSpaceOnUse" ${region}>${inner}</mask>`
  const rect = `<rect ${region} fill="${color}" mask="url(#m)"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${dims}>${mask}${rect}</svg>`
}
