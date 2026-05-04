/// <reference types="vite/client" />

import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import * as React from 'react'
import css from '~/styles.css?url'

const title = 'Wevm — TypeScript tools for the frontier'
const description = 'TypeScript tools for the frontier.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title },
      { name: 'description', content: description },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'og:type', content: 'website' },
      { name: 'og:title', content: title },
      { name: 'og:description', content: description },
    ],
    links: [
      { rel: 'stylesheet', href: css },
      { rel: 'icon', type: 'image/svg+xml', href: '/icon-light.svg' },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/icon-dark.svg',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  }),
  shellComponent: Document,
})

function Document({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
        <script src="https://cdn.usefathom.com/script.js" data-site="BJCLKMYS" defer />
      </body>
    </html>
  )
}
