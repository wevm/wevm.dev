import * as Logos from './lib/logos'

/**
 * Generate normalized monochrome logos in `public/logo/` from the
 * raw committed sources in `public/logos/`. Pure file-IO — no KV, no
 * edge cache, no network.
 *
 * Used by:
 * - **CI** (push to `main`): the `sync-logos` workflow runs this and
 *   commits the result back to the repo.
 * - **Local**: `pnpm gen:logos` regenerates the output dir in place.
 *
 * Inputs are all git-tracked (`public/logos/`, `scripts/lib/svg.ts`,
 * `wevm.config.ts`). Run when any of those change.
 */
await Logos.run()
