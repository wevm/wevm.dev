import { app } from './app.js'
import * as Cron from './cron.js'

export default {
  fetch: (request, env, ctx) => app.fetch(request, env, ctx),
  scheduled: Cron.scheduled,
} satisfies ExportedHandler<Cloudflare.Env>
