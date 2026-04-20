/**
 * Creates a debounced version of a refetch callback.
 * Multiple Realtime events within the delay window trigger only one refetch.
 */
export function createDebouncedRefetch(
  refetch: () => void,
  delay = 300,
) {
  let timer: ReturnType<typeof setTimeout> | null = null

  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      refetch()
      timer = null
    }, delay)
  }

  // Note: caller should clean up via the returned function's closure.
  // For cleanup, the hook's useEffect return handles it.
}