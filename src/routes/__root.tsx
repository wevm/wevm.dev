/// <reference types="vite/client" />

import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import * as React from 'react'
import * as Config from '~/lib/config'
import css from '~/styles.css?url'

const config = Config.get()

const orgId = 'https://wevm.dev/#org'
const title = 'Wevm — TypeScript tools for the frontier'
const description =
  'Wevm builds open-source TypeScript libraries used in production by hundreds of enterprises and millions of developers.'
const image = 'https://wevm.dev/og.png'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title },
      { name: 'description', content: description },
      // Theme color matches `--background-color-primary` light/dark in styles.css
      // so the browser chrome (mobile address bar, PWA splash) blends with the page.
      { name: 'theme-color', content: '#f5f5f3', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#0c0c0c', media: '(prefers-color-scheme: dark)' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: '@wevm_dev' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
      { name: 'twitter:image:alt', content: description },
      // OpenGraph spec uses `property=`, not `name=`. FB scrapers reject `name`.
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Wevm' },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:url', content: 'https://wevm.dev/' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: image },
      { property: 'og:image:alt', content: description },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
    ],
    links: [
      { rel: 'stylesheet', href: css },
      { rel: 'canonical', href: 'https://wevm.dev/' },
      // Warm the TCP+TLS handshake to Fathom before the deferred analytics
      // script actually loads — saves ~100–300ms on the eventual request.
      { rel: 'preconnect', href: 'https://cdn.usefathom.com' },
      { rel: 'icon', type: 'image/svg+xml', href: '/icon-light.svg' },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/icon-dark.svg',
        media: '(prefers-color-scheme: dark)',
      },
      // Preload the hero font (bold) — it paints the LCP element ("TypeScript
      // tools for the frontier"). `crossorigin` is required for fonts even
      // when same-origin so the preload matches the actual font request.
      {
        rel: 'preload',
        href: '/fonts/HelveticaNowDisplay-Bold.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
    ],
  }),
  shellComponent: Document,
})

const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': orgId,
      name: 'Wevm',
      alternateName: 'weth, LLC',
      url: 'https://wevm.dev/',
      logo: 'https://wevm.dev/android-chrome-512x512.png',
      description,
      sameAs: ['https://github.com/wevm', 'https://x.com/wevm_dev'],
      member: config.team.map((t) => ({ '@id': `https://github.com/${t.github}#person` })),
    },
    ...config.team.map((t) => ({
      '@type': 'Person',
      '@id': `https://github.com/${t.github}#person`,
      name: t.handle,
      url: `https://github.com/${t.github}`,
      sameAs: [
        `https://github.com/${t.github}`,
        ...(t.twitter ? [`https://x.com/${t.twitter}`] : []),
      ],
      worksFor: { '@id': orgId },
    })),
    ...config.highlighted.projects.map((p) => {
      const slug = p.github.split('/')[1] ?? ''
      const name = p.name ?? slug.charAt(0).toUpperCase() + slug.slice(1)
      const repoUrl = `https://github.com/${p.github}`
      return {
        '@type': 'SoftwareApplication',
        '@id': `${repoUrl}#app`,
        name,
        url: p.href ?? repoUrl,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Cross-platform',
        codeRepository: repoUrl,
        publisher: { '@id': orgId },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        ...(p.desc ? { description: p.desc } : {}),
      }
    }),
  ],
})

function Document({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must render verbatim
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      </head>
      <body>
        {children}
        <Scripts />
        <script src="https://cdn.usefathom.com/script.js" data-site="BJCLKMYS" defer />
      </body>
    </html>
  )
}
