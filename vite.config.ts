import { defineConfig } from 'vite-plus'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
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
