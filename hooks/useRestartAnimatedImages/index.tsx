import { useEffect, useRef } from 'react';

/**
 * GIF is the one extension that implies animation. `.webp` and `.png` (the extension an APNG
 * ships under) are overwhelmingly static, so matching them would reload far more images than
 * it rewinds; telling those apart needs the bytes, not the URL.
 */
const ANIMATED_IMAGE_SRC = /\.gif(\?|#|$)/i;

const restartAnimatedImages = (root: HTMLElement | null | undefined) => {
  root?.querySelectorAll('img').forEach(img => {
    if (!ANIMATED_IMAGE_SRC.test(img.src)) return;
    const { src } = img;
    // There's no seek API for animated images; reassigning `src` is the only reset
    img.src = '';
    img.src = src;
  });
};
const useRestartAfterFirstPaint = (revealKey: unknown, restart: () => void) => {
  const isFirstRender = useRef(true);
  const latestRestart = useRef(restart);
  latestRestart.current = restart;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    latestRestart.current();
  }, [revealKey]);
};

/**
 * Restarts GIF playback inside the panel that just became active.
 *
 * Tabs keep every panel mounted, so an <img> is never re-created and a GIF is
 * shown mid-loop (or frozen on its last frame) when its tab is re-selected.
 *
 * @returns a ref to attach to each panel element, indexed by tab.
 */
export default function useRestartAnimatedImages(activeIndex: number) {
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  useRestartAfterFirstPaint(activeIndex, () => restartAnimatedImages(panelRefs.current[activeIndex]));

  return panelRefs;
}

/**
 * Restarts GIF playback inside an element that has just been revealed after being hidden —
 * a collapsed <details>, whose images have been animating out of sight since page load.
 */
export function useRestartAnimatedImagesOnReveal<T extends HTMLElement>(isRevealed: boolean) {
  const contentRef = useRef<T | null>(null);

  useRestartAfterFirstPaint(isRevealed, () => {
    // Rewinding content the reader just hid would be wasted work
    if (isRevealed) restartAnimatedImages(contentRef.current);
  });

  return contentRef;
}
