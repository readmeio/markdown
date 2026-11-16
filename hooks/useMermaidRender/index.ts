import type { RefObject } from 'react';

import { useContext, useEffect } from 'react';

import ThemeContext from '../../contexts/Theme';
import useHydrated from '../useHydrated';

// Module-level queue that batches mermaid nodes across all MermaidDiagram instances into a
// single mermaid.run() call. This is necessary because mermaid generates SVG element IDs
// using Date.now(), which collides when multiple diagrams render in the same millisecond.
// Colliding IDs cause diagrams to overlap or break layout.
//
// Why not use `deterministicIDSeed` with a unique ID per diagram? Mermaid's implementation
// only uses seed.length (not the seed value) to compute the starting ID, so every UUID
// (36 chars) produces the same `mermaid-36` prefix — the collision remains.
// See: https://github.com/mermaid-js/mermaid/blob/mermaid%4011.12.0/packages/mermaid/src/utils.ts#L755-L761
//
// These vars must be module-scoped (not per-instance refs) because the batching requires
// cross-instance coordination. They are short-lived: the queue drains on the next macrotask
// and cleanup drops a diagram's node on unmount.
let mermaidQueue: HTMLPreElement[] = [];
let mermaidFlushTimer: ReturnType<typeof setTimeout> | null = null;
let currentTheme: string | undefined;

function queueMermaidNode(node: HTMLPreElement, theme: string) {
  mermaidQueue.push(node);
  currentTheme = theme;

  if (!mermaidFlushTimer) {
    // setTimeout(0) defers to a macrotask, after all useEffects have queued their nodes
    mermaidFlushTimer = setTimeout(async () => {
      const nodes = [...mermaidQueue];
      mermaidQueue = [];
      mermaidFlushTimer = null;

      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        theme: currentTheme === 'dark' ? 'dark' : 'default',
        deterministicIds: true,
      });

      await mermaid.run({ nodes });
    }, 0);
  }
}

/** Drops an unmounting diagram without discarding other diagrams still waiting in the batch. */
function dequeueMermaidNode(node: HTMLPreElement | null) {
  mermaidQueue = mermaidQueue.filter(queued => queued !== node);
  // Nothing left to render, so stop mermaid from running after the DOM is torn down
  if (!mermaidQueue.length && mermaidFlushTimer) {
    clearTimeout(mermaidFlushTimer);
    mermaidFlushTimer = null;
  }
}

/** Renders the referenced pre with mermaid after hydration, and again when the theme changes. */
export default function useMermaidRender(ref: RefObject<HTMLPreElement>) {
  const theme = useContext(ThemeContext);
  const isHydrated = useHydrated();

  useEffect(() => {
    const node = ref.current;
    // Wait for hydration so mermaid's DOM mutations don't cause mismatches
    if (isHydrated && node) {
      queueMermaidNode(node, theme);
    }

    return () => dequeueMermaidNode(node);
  }, [isHydrated, ref, theme]);
}
