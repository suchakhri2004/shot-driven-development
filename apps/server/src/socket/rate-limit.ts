/** Sliding-window limiter so one noisy client cannot flood a room. */
export class RateLimiter {
  private hits: number[] = []

  constructor(
    private readonly limit = 40,
    private readonly windowMs = 5000
  ) {}

  allow(now = Date.now()): boolean {
    this.hits = this.hits.filter((t) => now - t < this.windowMs)
    if (this.hits.length >= this.limit) return false
    this.hits.push(now)
    return true
  }
}
