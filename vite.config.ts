import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite-plus'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import icons from 'unplugin-icons/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    bytesImport(),
    icons({ compiler: 'jsx', jsx: 'react' }),
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact(),
  ],
  fmt: {
    semi: false,
    singleQuote: true,
  },
  lint: {
    ignorePatterns: ['dist/**', '.wrangler/**', 'src/routeTree.gen.ts'],
  },
  staged: {
    '*': 'vp check --fix',
  },
})

/**
 * Resolves `?bytes` imports (e.g. `import font from './font.ttf?bytes'`)
 * to an inlined `Uint8Array`. Used by the OG image worker to ship font
 * bytes in the bundle without runtime fetches.
 */
function bytesImport(): Plugin {
  return {
    name: 'bytes-import',
    enforce: 'pre',
    resolveId(id, importer) {
      if (!id.endsWith('?bytes')) return
      const path = id.slice(0, -6)
      const resolved = importer ? resolve(dirname(importer), path) : resolve(path)
      return '\0bytes:' + resolved
    },
    load(id) {
      if (!id.startsWith('\0bytes:')) return
      const buf = readFileSync(id.slice(7))
      return `export default new Uint8Array([${buf.join(',')}]);`
    },
  }
}
