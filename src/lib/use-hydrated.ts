'use client'

import { useSyncExternalStore } from 'react'

/** Nothing to subscribe to — the value flips once, when React hydrates. */
const subscribe = () => () => {}

/**
 * `false` on the server and through hydration, `true` afterwards.
 *
 * Anything that reads a browser-only value — the resolved theme, the local
 * timezone — has to render something neutral first or React will complain that
 * the markup it hydrated doesn't match. `useSyncExternalStore` expresses that
 * directly: `getServerSnapshot` covers the render React compares against, and
 * `getSnapshot` takes over once the client owns the tree.
 *
 * The `useState` + `useEffect(() => setMounted(true))` version of this does the
 * same thing with an extra render pass and trips React's set-state-in-effect
 * rule, which is right to flag it — an effect that only ever sets a flag is
 * synchronising with the renderer, not with an external system.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
