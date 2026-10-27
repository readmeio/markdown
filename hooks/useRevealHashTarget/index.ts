import type { MutableRefObject } from 'react';

import { useEffect } from 'react';

/** Finds the element a `#hash` points to. */
function getHashTarget(hash: string) {
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

/** Opens the tab that holds the URL hash target, since a hidden panel can't be scrolled to. */
export default function useRevealHashTarget(
  panelRefs: MutableRefObject<(HTMLElement | null)[]>,
  reveal: (index: number) => void,
) {
  useEffect(() => {
    const revealHashTarget = (hash: string) => {
      const target = getHashTarget(hash);
      if (!target) return;

      const index = panelRefs.current.findIndex(panel => panel?.contains(target));
      if (index === -1) return;

      reveal(index);
      // Showing the panel only now gives the target a layout box, so scroll to it ourselves
      window.requestAnimationFrame(() => target.scrollIntoView());
    };

    const onHashChange = () => revealHashTarget(window.location.hash);
    // A link to the hash already in the URL fires no `hashchange`, so reveal on the click too
    const onClick = (event: MouseEvent) => {
      // Leave cancelled clicks and ones that open a new tab or window alone
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      if (link) revealHashTarget(link.getAttribute('href') ?? '');
    };

    onHashChange();
    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      document.removeEventListener('click', onClick);
    };
  }, [panelRefs, reveal]);
}
