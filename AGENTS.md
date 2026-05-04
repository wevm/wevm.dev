# Agent Conventions

Conventions for working in this repo.

> **Update after learnings or mistakes** — when a correction, new convention, or hard-won lesson emerges during development, append it to the relevant section of this file immediately. AGENTS.md is the source of truth for project conventions and should grow as the project does.

## TypeScript Conventions

- **No `readonly` on properties** — skip `readonly` on type properties.
- **`readonly` arrays** — use `readonly T[]` for array types in type definitions.
- **`type` over `interface`** — always use `type` for type definitions.
- **`.js` extensions** — all imports include `.js` for ESM compatibility (where applicable).
- **Classes for errors only** — all other APIs use factory functions.
- **No enums** — use `as const` objects for fixed sets.
- **`const` generic modifier** — use to preserve literal types for full inference.
- **camelCase generics** — `<const args extends z.ZodObject<any>>` not `<T>`.
- **Read worker env globally for worker-only code; thread it for shared code** — when a module is only ever loaded in the worker runtime (e.g. `src/lib/sources.ts`, the SSR loader), import the env at module top: `import { env } from 'cloudflare:workers'`. Bindings (KV, R2, D1, etc.) are NOT exposed on `process.env` — only env vars + secrets are — so `cloudflare:workers` is the canonical source. When a module is shared with a Node script that runs via `getPlatformProxy` (e.g. `worker/sync.ts` shared with `scripts/gen:data.ts`, or `worker/kv.ts` consumed by both the SSR loader and the script via sync), `cloudflare:workers` won't resolve in Node, so accept `env: Cloudflare.Env` (or a binding like `kv: KVNamespace`) as a parameter and let the caller pass `c.env` (worker), `env` from `cloudflare:workers` (SSR loader), or the proxy env (script).
- **Options default `= {}`** — use `options: Options = {}` not `options?: Options`.
- **Namespace params and return types** — place function parameter and return types in a `declare namespace` matching the function name (e.g. `local.Options`, `createAccount.ReturnType`).
- **Minimal variable names** — prefer short, obvious names. Use `options` not `serveOptions`, `fn` not `callbackFunction`, etc. Context makes meaning clear.
- **camelCase for constants** — module-level constants use `camelCase` (`sponsors`, `repos`), not `SCREAMING_SNAKE_CASE` (`SPONSORS`, `REPOS`).
- **Prefer single-word variable names** — default to a single word: `repo` not `repoData`, `pkg` not `pkgFile`, `entry` not `dirEntry`, `text` not `pkgText`. The surrounding scope (function name, parameter type, namespace) already supplies context, so the variable doesn't need to repeat it.
- **No camelCase / conjunctive variable names** — only when a single word genuinely collides in scope, prefer a snake-case suffix over CamelCase concatenation. Use `options` (or `options_fill`) not `fillOptions`, `client` (or `client_fill`) not `fillClient`. The base noun stays the same so reading flows; the suffix only kicks in when the same name is reused in scope.
- **Don't repeat the module name in exports** — if the module is `mode.ts`, export `get` not `getMode`. Callers write `Mode.get()` which already reads clearly. (See **Module Conventions** for the full pattern.)
- **No redundant type annotations** — if the return type of a function already covers it, don't annotate intermediate variables. Let the return type do the work (e.g. `const cli = { ... }` not `const cli: ReturnType = { ... }`).
- **Return directly** — don't declare a variable just to return it. Use `return { ... }` unless the variable is needed (e.g. self-reference for chaining).
- **Skip braces for single-statement blocks** — omit `{}` for single-statement `if`, `for`, etc.
- **No section separator comments** — don't use `// ---` or `// ===` divider comments. Let JSDoc and whitespace provide structure.
- **No dynamic imports** — use static `import` declarations. No `await import(...)` or `import(...)` expressions.
- **`as never` over `as any`** — when a type assertion is unavoidable, use `as never` instead of `as any`.
- **Destructure when accessing multiple properties** — prefer `const { a, b } = options` over repeated `options.a`, `options.b`.
- **`core_` prefix for import aliases** — when aliasing an import to avoid conflicts, use `core_<name>` (e.g. `import { local as core_local }`), not arbitrary camelCase.
- **IIFE over nested ternaries** — avoid complex nested ternary expressions. Use an IIFE block expression with early returns instead:

  ```tsx
  // ✗ Bad: nested ternaries
  const subtitle = a ? <A /> : b ? <B /> : 'default'

  // ✓ Good: IIFE with early returns
  const subtitle = (() => {
    if (a) return <A />
    if (b) return <B />
    return 'default'
  })()
  ```

## Module Conventions

- **Lib modules are instantiable yet functional** — design library modules so the same surface supports both stateful instances and pure function calls. State, when needed, is passed in explicitly as the first argument; there are no hidden singletons or `new ClassName()` requirements.
- **Implicit namespace import** — consume lib modules as `import * as Fetcher from './fetcher.js'`, never `import { run } from './fetcher.js'`. The namespace **is** the public API surface; the file name owns the noun.
- **`from` is the instance constructor** — the conventional verb to instantiate is `from`. Callers write `Fetcher.from(options)`, `Cache.from(options)`. Avoid `init`, `create`, `make`, `new*`.
- **Name the instance type after the module** — the type returned by `from`/`get` takes the module's PascalCase name (`Fetcher`, `Cache`, `Sync`). Avoid the generic `Instance` name. Callers write `const fetcher: Fetcher.Fetcher = Fetcher.from(...)` or, more often, just rely on inference.
- **Verby exports** — non-constructor exports are verbs: `run`, `start`, `stop`, `get`, `set`, `refresh`, `parse`. Callers write `Fetcher.run(…)`, `Cache.get(key)`, `Stats.refresh()`. Reading the call site reveals both subject (namespace) and action (verb).
- **No module name in function names** — never `Fetcher.runFetcher()`, `Cache.getCache()`, `Stats.refreshStats()`. The namespace already says it. This is a stricter restatement of "Don't repeat the module name in exports".
- **Shape**: types live alongside verbs in the same file. Use `declare namespace verb { type Options; type ReturnType }` (per existing TypeScript convention) so callers see `Fetcher.run.Options` from the namespace.

  ```ts
  // fetcher.ts
  export type Fetcher = {
    /* state */
  }

  export function from(options: from.Options = {}): Fetcher {
    /* ... */
  }
  export declare namespace from {
    type Options = {
      /* ... */
    }
  }

  export function run(fetcher: Fetcher, input: run.Input): Promise<run.ReturnType> {
    /* ... */
  }
  export declare namespace run {
    type Input = {
      /* ... */
    }
    type ReturnType = {
      /* ... */
    }
  }
  ```

  ```ts
  // caller.ts
  import * as Fetcher from './fetcher.js'

  const fetcher = Fetcher.from({
    /* ... */
  })
  await Fetcher.run(fetcher, {
    /* ... */
  })
  ```

## Type Inference Conventions

- **`const` generics on definitions** — any function that accepts schemas/records and passes them to callbacks must use `const` generic parameters to preserve literal types.
- **Flow types through generics** — when a factory function accepts schemas, use generics to flow the inferred type through to callbacks, return types, and constraint types. Never fall back to `any` in callback signatures.
- **Type tests in `.test-d.ts`** — use vitest's `expectTypeOf` in colocated `.test-d.ts` files to assert generic inference works. Type tests are first-class — write them alongside implementation, not as an afterthought.
- **No `any` leakage** — generics may use `any` as a bound, but inferred types flowing to user-facing callbacks must be narrowed. The user should never see `any` in their IDE.

## Documentation Conventions

- **JSDoc on all exports** — every exported function, type, and constant gets a JSDoc comment. Type properties get JSDoc too. Namespace types (e.g. `declare namespace create { type Options }`) get JSDoc too. Doc-driven development: write the JSDoc before or alongside the implementation, not after.

## Abstraction Conventions

- **Prefer duplication over the wrong abstraction** — duplicated code with a clear bug-fix burden is better than a bad abstraction that is scary to change.
- **Don't abstract until the commonalities scream** — wait for 3+ concrete use cases where the right abstraction becomes obvious. Don't abstract for 1–2 instances.
- **Optimize for change** — code that is easy to change beats code that is cleverly DRY. We don't know future requirements.
- **No flags or mode parameters** — if an abstraction needs `if` branches or boolean params to handle different call sites, it's the wrong abstraction. Inline it.
- **Start concrete, extract later** — begin inline. Extract only when a clear pattern emerges across multiple real usages.
- **Inline values close to usage** — keep constants, derived values, and helpers inside the function/component that consumes them. Only hoist to module scope (or pass as props) when a second consumer appears. Don't hoist `const downloads = '——'` to the module if only `Topbar` reads it; don't compute `year` in a parent and pass it down if only `Footer` uses it.

## Git Conventions

- **Conventional commits** — use `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:` prefixes. Scope is optional (e.g. `feat(parser): add array coercion`).

## React Component Conventions

- **Inline small components** — colocate components in the file. Don't extract into separate component files (or `src/components/` / `src/utils/` directories) until reusability is needed. Place helper components at the bottom of the file that uses them.
- **Avoid conjunctive component names** — `Projects`, not `CoreProjects`. The base noun is enough.
- **Comment non-obvious intent** — add short inline comments next to code whose purpose isn't immediately clear from the code itself (e.g. mode branches, workarounds, why something is conditional). Don't comment what the code does — comment why.
- **Prefer Tailwind over `style` attributes** — use Tailwind utility classes instead of inline `style` props. Only use `style` for truly dynamic values that can't be expressed as utilities.
- **CVA for variant styles** — use `cva` for any component with visual variants (size, intent, state). Define variants declaratively instead of hand-rolling conditional class logic.
- **`data-` attributes over ternaries** — express boolean/enum states as `data-*` attributes on the element and target them with Tailwind's `data-*:` variants instead of ternary expressions in `className`. For example, `data-active={active}` with `data-active:bg-mute` instead of `${active ? 'bg-mute' : ''}`.
- **`cx` for class composition** — use `cx` from `cva` to merge class strings. Prefer `cx` over template literals for conditional classes.
- **Alphabetize props** — order destructured props, type properties, and JSX attributes alphabetically.
- **No margin for spacing** — use `gap` on the parent or `padding` instead of `mt-*`/`mb-*`/`ml-*`/`mr-*`. Margin creates invisible coupling between siblings; gap and padding keep spacing ownership clear.

## React Query Conventions

- **Return the full query result from hooks** — don't destructure/re-wrap `useQuery` return values in custom hooks. Return the `UseQueryResult` directly so callers retain access to all tracked values (`.data`, `.isLoading`, `.error`, `.refetch`, `.fetchStatus`, etc.). Re-wrapping loses reactivity tracking and forces the hook to be updated whenever a new field is needed.
- **Compose queries via query options** — when a hook needs to combine multiple queries, don't call `useQuery` for each and then merge the results into a custom shape. Instead, create a single `useQuery` whose `queryFn` internally uses the sub-queries' options (e.g. `queryClient.fetchQuery(subQueryOptions)`) so the hook still returns one `UseQueryResult`.

## Styling

- **Tailwind v4 namespace utilities over arbitrary CSS variable references** — Tailwind v4 generates a utility for every variable defined under `@theme`. Use the generated utility (`bg-panel`), not `bg-(--background-color-panel)`.
- **Theme lives in [src/styles.css](src/styles.css)** under `@theme` — no `tailwind.config.*`.
- **Use semantic names** (`primary`, `muted`, `panel`, `inverted`), not implementation names (`fg`, `bg`, `tag-bg`).
- **Hover invert (`bg`↔`text` swap)** — use the dedicated `--background-color-inverted` and `--text-color-inverted` vars so it stays expressible as `hover:bg-inverted hover:text-inverted`.

## Interactions

- **Keyboard works everywhere.** All flows are keyboard-operable & follow WAI-ARIA Authoring Patterns.
- **Clear focus.** Use `:focus-visible` (not `:focus`). Add `:focus-within` for grouped controls.
- **Match visual & hit targets.** If visual target < 24px, expand hit target to ≥ 24px. On mobile, minimum is 44px.
- **Loading buttons.** Show a loading indicator **and** keep the original label visible.
- **Minimum loading-state duration.** Add a show-delay (~150–300ms) and a minimum visible time (~300–500ms) to avoid flicker.
- **URL as state.** Persist filters, tabs, pagination, expanded panels in the URL so share, refresh, and Back/Forward work.
- **Optimistic updates.** Update UI immediately when success is likely. On failure, show an error & roll back or offer Undo.
- **Ellipsis for further input & loading.** Menu items that open follow-up dialogs end with `…` (e.g., "Rename…"). Loading labels end with `…` (e.g., "Saving…").
- **Confirm destructive actions.** Require confirmation or provide Undo with a safe window.
- **Tooltip timing.** Delay the first tooltip in a group; subsequent peer tooltips show with no delay.
- **Autofocus for speed.** On desktop screens with a single primary input, autofocus it. Avoid on mobile (keyboard causes layout shift).
- **Links are links.** Use `<a>` (or framework `<Link>`) for navigation — never `<button>` or `<div>`.
- **Don't block paste.** Never disable paste in `<input>` or `<textarea>`.
- **Mobile input size.** `<input>` font size ≥ 16px on mobile to prevent iOS Safari auto-zoom.

## Animations

- **Honor `prefers-reduced-motion`.** Always provide a reduced-motion variant.
- **Implementation preference.** CSS → Web Animations API → JS libraries (e.g., `motion`).
- **GPU-accelerated properties.** Stick to `transform` and `opacity`. Avoid `width`, `height`, `top`, `left`.
- **Never `transition: all`.** Explicitly list only the properties you animate.
- **Interruptible.** Animations are cancelable by user input.

## Layout

- **Optical alignment.** Adjust ±1px when perception beats geometry.
- **Responsive coverage.** Verify on mobile, laptop, and ultra-wide.
- **Let the browser size things.** Prefer flex/grid/intrinsic layout over JS measuring.

## Content

- **Inline help first.** Prefer inline explanations; use tooltips as a last resort.
- **Stable skeletons.** Skeletons mirror final content exactly to avoid layout shift.
- **All states designed.** Empty, sparse, dense, and error states.
- **Tabular numbers for comparisons.** Use `font-variant-numeric: tabular-nums` for numeric columns.
- **Icons have labels.** `aria-label` on icon-only buttons.
- **Semantics before ARIA.** Prefer native elements (`button`, `a`, `label`, `table`) before `aria-*`.
- **No dead ends.** Every screen offers a next step or recovery path.

## Forms

- **Enter submits.** When a text input is focused, Enter submits. In `<textarea>`, ⌘/⌃+Enter submits.
- **Labels everywhere.** Every control has a `<label>` or is associated with one.
- **Don't block typing.** Even number-only fields allow any input and show validation feedback.
- **Don't pre-disable submit.** Allow submitting incomplete forms to surface validation feedback.
- **Error placement.** Show errors next to their fields. On submit, focus the first error.
- **Placeholder with ellipsis.** End placeholders with `…`. Set an example value (e.g., `sk-012345679…`).

## Design

- **Layered shadows.** Mimic ambient + direct light with at least two shadow layers.
- **Crisp borders.** Combine borders and shadows; semi-transparent borders improve edge clarity.
- **Nested radii.** Child radius ≤ parent radius, concentric so curves align.
- **Interactions increase contrast.** `:hover`, `:active`, `:focus` states have more contrast than rest.
- **Minimum contrast.** Prefer APCA over WCAG 2 for perceptual accuracy.

## Performance

- **Minimize re-renders.** Track with React DevTools or React Scan.
- **Network latency budgets.** `POST`/`PATCH`/`DELETE` complete in < 500ms.
- **Virtualize large lists.** Use virtualization or `content-visibility: auto`.
- **No image-caused CLS.** Set explicit image dimensions and reserve space.
