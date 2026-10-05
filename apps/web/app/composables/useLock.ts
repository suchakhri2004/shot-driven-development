/**
 * Prevents accidental double taps: while one call is running (or within `cooldownMs` after it),
 * further calls are ignored. The server de-duplicates too, but this keeps the UI calm.
 */
export function useLock(cooldownMs = 250) {
  const busy = ref(false)

  async function run<T>(task: () => Promise<T>): Promise<T | undefined> {
    if (busy.value) return undefined
    busy.value = true
    try {
      return await task()
    } finally {
      setTimeout(() => (busy.value = false), cooldownMs)
    }
  }

  return { busy, run }
}
