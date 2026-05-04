import handler from '@tanstack/react-start/server-entry'
import { Hono } from 'hono'
import * as Sponsors from './sponsors.js'

/**
 * Top-level Hono app. Mount any custom worker routes (image
 * endpoints, future `/api/*` handlers) on this surface; everything
 * else falls through to the TanStack Start SSR handler so route
 * registration order is "Hono first, framework last".
 */
export const app = new Hono<{ Bindings: Cloudflare.Env }>()
  .route('/', Sponsors.app)
  .all('*', (c) => handler.fetch(c.req.raw))
