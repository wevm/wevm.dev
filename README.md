# wevm.dev

Source for [wevm.dev](https://wevm.dev).

## Configuration

Site config (curated lists, sponsors, team) lives in
[`wevm.config.ts`](./wevm.config.ts).

### Adding a sponsor logo

1. Drop the brand's wordmark SVG at `public/logos/<github-login>.svg`
   (lowercase, matches the GitHub org/user login exactly).
2. _Optional_: tune the optical scale via `logoOverrides` if the
   wordmark reads visually too heavy or too light at the default 1×.
3. Run `pnpm gen:logos` to regenerate `public/logos/mono/` and commit
   both the source and the generated output.

## Development

```sh
pnpm install      # install dependencies
pnpm gen          # seed local KV + regenerate logos
pnpm dev          # run dev server
```

## Scripts

```sh
pnpm dev          # run dev server
pnpm build        # run production build
pnpm preview      # preview the production build
pnpm deploy       # deploy

pnpm gen          # seed local kv and gen logos
pnpm gen:data     # seed local (or WRANGLER_REMOTE=true) KV with stars/downloads/sponsors
pnpm gen:logos    # generate public/logos/mono/ from public/logos/ 
pnpm gen:types    # genereate worker-configuration.d.ts

pnpm check        # check code
pnpm check:types  # check types
```
