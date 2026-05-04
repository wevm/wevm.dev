/** Options for {@link retry}. */
export type Options = {
  /** Maximum number of attempts (including the first). */
  attempts: number
  /** Initial backoff delay in milliseconds. */
  baseMs: number
  /** Backoff growth factor between attempts. */
  factor: number
  /**
   * Optional override that returns a delay in ms to wait before the next
   * attempt for this error (e.g. honor a `Retry-After` header). Returning
   * `undefined` falls through to exponential backoff.
   */
  retryAfter?: (error: unknown) => number | undefined
}

/**
 * Retry an async operation with exponential backoff. The final error
 * is re-thrown after the last attempt. Used by every upstream fetcher
 * in `worker/providers/*`.
 */
export async function retry<const result>(
  fn: () => Promise<result>,
  options: Options,
): Promise<result> {
  const { attempts, baseMs, factor, retryAfter } = options
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (error) {
      last = error
      if (i === attempts - 1) break
      const override = retryAfter?.(error)
      const delay = override ?? baseMs * factor ** i
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw last
}
