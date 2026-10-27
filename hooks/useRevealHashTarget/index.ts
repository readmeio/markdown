import type { MutableRefObject } from 'react';

import { useEffect } from 'react';

/** The element the URL hash names, or `null` when there is none or the hash isn't a valid id. */
function getHashTarget() {
  const { hash } = window.location;
  // ReadMe's admin hash router rewrites an anchor hash with its root `/`: `#heading` becomes `#/heading`
  const id = hash.startsWith('#/') ? hash.slice(2) : hash.slice(1);
  if (!id) return null;

  // Some ids are percent-encoded to stay lossless, so match the raw hash before the decoded one
  const raw = document.getElementById(id);
  if (raw) return raw;
  try {
    return document.getElementById(decodeURIComponent(id));
  } catch {
    return null;
  }
}

/**
 * Activates the panel holding the URL hash's target, on mount and on every hash change.
 *
 * Inactive panels are `hidden`, so neither the browser's `#fragment` scroll nor a
 * `scrollIntoView()` can reach a heading inside one until its panel is shown.
 */
export default function useRevealHashTarget(
  panelRefs: MutableRefObject<(HTMLElement | null)[]>,
  reveal: (index: number) => void,
) {
  useEffect(() => {
    const revealHashTarget = () => {
      const target = getHashTarget();
      if (!target) return;

      const index = panelRefs.current.findIndex(panel => panel?.contains(target));
      if (index === -1) return;

      reveal(index);
      // Showing the panel only now gives the target a layout box, so scroll to it ourselves
      window.requestAnimationFrame(() => target.scrollIntoView());
    };

    revealHashTarget();
    window.addEventListener('hashchange', revealHashTarget);
    return () => window.removeEventListener('hashchange', revealHashTarget);
  }, [panelRefs, reveal]);
}
