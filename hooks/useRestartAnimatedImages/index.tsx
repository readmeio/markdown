import { useEffect, useRef } from 'react';

/**
 * GIF is the one extension that implies animation. `.webp` and `.png` (the extension an APNG
 * ships under) are overwhelmingly static, so matching them would reload far more images than
 * it rewinds; telling those apart needs the bytes, not the URL.
 */
const ANIMATED_IMAGE_SRC = /\.gif(\?|#|$)/i;

/**
 * Restarts GIF playback inside the panel that just became active.
 *
 * Tabs keep every panel mounted, so an <img> is never re-created and a GIF is
 * shown mid-loop (or frozen on its last frame) when its tab is re-selected.
 * There's no seek API for animated images; reassigning `src` is the only reset,
 * and the reload is served from cache.
 *
 * @returns a ref to attach to each panel element, indexed by tab.
 */
export default function useRestartAnimatedImages(activeIndex: number) {
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the initial paint: those images are loading for the first time anyway.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    panelRefs.current[activeIndex]?.querySelectorAll('img').forEach(img => {
      if (!ANIMATED_IMAGE_SRC.test(img.src)) return;
      const { src } = img;
      img.src = '';
      img.src = src;
    });
  }, [activeIndex]);

  return panelRefs;
}
