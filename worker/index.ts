import handler from '@tanstack/react-start/server-entry'
import * as Cron from './cron'

export default {
  fetch: (request) => handler.fetch(request),
  scheduled: Cron.scheduled,
} satisfies ExportedHandler<Cloudflare.Env>
