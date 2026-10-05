/** One shared 250ms ticker for every countdown on screen (instead of a timer per component). */
const now = ref(Date.now())
let started = false

export function useNow() {
  if (import.meta.client && !started) {
    started = true
    setInterval(() => (now.value = Date.now()), 250)
  }
  return now
}
