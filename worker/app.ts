import handler from '@tanstack/react-start/server-entry'
import { Hono } from 'hono'
import * as Og from './og.js'
import * as Sponsors from './sponsors.js'

/**
 * Top-level Hono app. Mount any custom worker routes (image
 * endpoints, future `/api/*` handlers) on this surface; everything
 * else falls through to the TanStack Start SSR handler so route
 * registration order is "Hono first, framework last".
 */
export const app = new Hono<{ Bindings: Cloudflare.Env }>()
  // Canonical-host redirect — fold www.wevm.dev into the apex so search
  // engines, links, and analytics all converge on a single origin. 301
  // (permanent) signals to crawlers that link equity should transfer.
  .use('*', async (c, next) => {
    const url = new URL(c.req.url)
    if (url.hostname === 'www.wevm.dev') {
      url.hostname = 'wevm.dev'
      return c.redirect(url.toString(), 301)
    }
    return next()
  })
  .route('/', Og.app)
  .route('/', Sponsors.app)
  .all('*', (c) => handler.fetch(c.req.raw))
