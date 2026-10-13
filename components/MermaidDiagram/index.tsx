import React, { useContext, useEffect, useRef, useState } from 'react';

import ThemeContext from '../../contexts/Theme';
import useHydrated from '../../hooks/useHydrated';

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
// and cleanup clears everything on unmount.
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

// Zoom is an integer step count so zooming back always lands exactly on 1x.
// -3..8 steps of 1.25x ≈ 0.5x..6x: enough to read a wide diagram mermaid has shrunk to column width.
const ZOOM_STEP = 1.25;
const MIN_ZOOM = -3;
const MAX_ZOOM = 8;
const INITIAL_VIEW = { zoom: 0, x: 0, y: 0 };
type View = typeof INITIAL_VIEW;

// Presses on labels and links keep native text selection and link clicks instead of panning
const NON_PAN_TARGETS = 'a, text, foreignObject';

const isSameView = (a: View, b: View) => a.zoom === b.zoom && a.x === b.x && a.y === b.y;

/** Zooms around the diagram's centre by scaling the pan offset with it. */
const zoomTo = (view: View, target: number): View => {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, target));
  const ratio = ZOOM_STEP ** (zoom - view.zoom);
  return { zoom, x: view.x * ratio, y: view.y * ratio };
};

const CONTROLS = [
  { label: 'Zoom out', icon: 'fa-magnifying-glass-minus', apply: (view: View) => zoomTo(view, view.zoom - 1) },
  { label: 'Zoom in', icon: 'fa-magnifying-glass-plus', apply: (view: View) => zoomTo(view, view.zoom + 1) },
  { label: 'Reset view', icon: 'fa-arrow-rotate-left', apply: () => INITIAL_VIEW },
] as const;

/**
 * Single mermaid diagram with zoom and drag-to-pan. mermaid.run() replaces the pre's children with an
 * svg, so the controls are a sibling and the transform reaches the svg through a CSS variable.
 */
const MermaidDiagram = ({ value }: { value: string }) => {
  const theme = useContext(ThemeContext);
  const isHydrated = useHydrated();
  const mermaidRef = useRef<HTMLPreElement>(null);
  const lastPointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const [view, setView] = useState(INITIAL_VIEW);
  const transform = isSameView(view, INITIAL_VIEW)
    ? undefined
    : `translate(${view.x}px, ${view.y}px) scale(${ZOOM_STEP ** view.zoom})`;

  useEffect(() => {
    // Wait for hydration so mermaid's DOM mutations don't cause mismatches
    if (isHydrated && mermaidRef.current) {
      queueMermaidNode(mermaidRef.current, theme);
    }

    return () => {
      // Clear the batch timer on unmount to prevent mermaid from running
      // after the DOM is torn down
      if (mermaidFlushTimer) {
        clearTimeout(mermaidFlushTimer);
        mermaidFlushTimer = null;
        mermaidQueue = [];
      }
    };
  }, [theme, isHydrated]);

  const startPan = (e: React.PointerEvent<HTMLPreElement>) => {
    const isContent = e.target instanceof Element && e.target.closest(NON_PAN_TARGETS);
    // Touch only pans once zoomed (matching touch-action) so swiping past a diagram scrolls the page
    const isTouchAt1x = e.pointerType === 'touch' && !view.zoom;
    const isRendered = e.currentTarget.firstElementChild instanceof SVGSVGElement;
    if (e.button !== 0 || lastPointer.current || isContent || isTouchAt1x || !isRendered) return;
    e.preventDefault(); // stops the drag from starting a text selection
    e.currentTarget.setPointerCapture(e.pointerId);
    lastPointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  // Applies deltas rather than absolute offsets so a mid-drag zoom isn't overwritten
  const pan = (e: React.PointerEvent) => {
    const last = lastPointer.current;
    if (!last || last.id !== e.pointerId) return;
    lastPointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    setView(v => ({ ...v, x: v.x + e.clientX - last.x, y: v.y + e.clientY - last.y }));
  };

  const endPan = (e: React.PointerEvent) => {
    if (lastPointer.current?.id === e.pointerId) lastPointer.current = null;
  };

  return (
    <div className={`MermaidDiagram theme-${theme}${view.zoom ? ' MermaidDiagram_zoomed' : ''}`}>
      <pre
        ref={mermaidRef}
        className="mermaid-render mermaid_single"
        onPointerCancel={endPan}
        onPointerDown={startPan}
        onPointerMove={pan}
        onPointerUp={endPan}
        style={{ '--MermaidDiagram-transform': transform } as React.CSSProperties}
      >
        {value}
      </pre>
      {isHydrated && (
        <div aria-label="Diagram controls" className="MermaidDiagram-controls" role="group">
          {CONTROLS.map(({ label, icon, apply }) => (
            <button
              key={label}
              aria-disabled={isSameView(apply(view), view)}
              aria-label={label}
              onClick={() => setView(apply)}
              title={label}
              type="button"
            >
              <i aria-hidden="true" className={`fa-regular ${icon}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MermaidDiagram;
