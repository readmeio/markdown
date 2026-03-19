import type { Mermaid } from 'mermaid';

import syntaxHighlighterUtils from '@readme/syntax-highlighter/utils';
import React, { useContext, useEffect, useRef } from 'react';

import ThemeContext from '../../contexts/Theme';
import useHydrated from '../../hooks/useHydrated';

let mermaid: Mermaid;

const { uppercase } = syntaxHighlighterUtils;

// Batch mermaid nodes across CodeTabs instances into a single mermaid.run() call.
// Mermaid generates SVG IDs via Date.now(), which collides when multiple diagrams
// are processed within the same millisecond. It messes up SVG elements since mermaid 
// uses global selector. Batching with deterministicIds ensures a single incrementing 
// counter is used across all diagrams.
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

      const module = await import('mermaid');
      mermaid = module.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: currentTheme === 'dark' ? 'dark' : 'default',
        deterministicIds: true,
      });

      await mermaid.run({ nodes });
    }, 0);
  }
}

interface Props {
  children: JSX.Element | JSX.Element[];
}

const CodeTabs = (props: Props) => {
  const { children } = props;
  const theme = useContext(ThemeContext);
  const isHydrated = useHydrated();
  const mermaidRef = useRef<HTMLPreElement>(null);

  // Handle both array (from rehype-react in rendering mdxish) and single element (MDX/JSX runtime) cases
  // The children here is the individual code block objects
  const childrenArray = Array.isArray(children) ? children : [children];

  // The structure varies depending on rendering context:
  // - When rendered via rehype-react: pre.props.children is an array where the first element is the Code component
  // - When rendered via MDX/JSX runtime: pre.props.children is directly the Code component
  const getCodeComponent = (pre: JSX.Element) => {
    return Array.isArray(pre?.props?.children) ? pre.props.children[0] : pre?.props?.children;
  };

  const containAtLeastOneMermaid = childrenArray.some(pre => getCodeComponent(pre)?.props?.lang === 'mermaid');

  useEffect(() => {
    // Wait for hydration so mermaid's DOM mutations don't cause mismatches
    if (typeof window !== 'undefined' && containAtLeastOneMermaid && isHydrated && mermaidRef.current) {
      queueMermaidNode(mermaidRef.current, theme);
    }
  }, [containAtLeastOneMermaid, theme, isHydrated]);

  function handleClick({ target }, index: number) {
    const $wrap = target.parentElement.parentElement;
    const $open = [].slice.call($wrap.querySelectorAll('.CodeTabs_active'));
    $open.forEach((el: Element) => el.classList.remove('CodeTabs_active'));
    $wrap.classList.remove('CodeTabs_initial');

    const codeblocks = $wrap.querySelectorAll('pre');
    codeblocks[index].classList.add('CodeTabs_active');

    target.classList.add('CodeTabs_active');
  }

  // We want to render single mermaid diagrams without the code tabs UI
  if (childrenArray.length === 1) {
    const codeComponent = getCodeComponent(childrenArray[0]);
    if (codeComponent?.props?.lang === 'mermaid') {
      const value = codeComponent?.props?.value;
      return (
        <pre ref={mermaidRef} className="mermaid-render mermaid_single">
          {value}
        </pre>
      );
    }
  }

  return (
    <div className={`CodeTabs CodeTabs_initial theme-${theme}`}>
      <div className="CodeTabs-toolbar">
        {childrenArray.map((pre, i) => {
          // the first or only child should be our Code component
          const tabCodeComponent = Array.isArray(pre.props?.children) ? pre.props.children[0] : pre.props?.children;
          const lang = tabCodeComponent?.props?.lang;
          const meta = tabCodeComponent?.props?.meta;

          /* istanbul ignore next */
          return (
            <button key={i} onClick={e => handleClick(e, i)} type="button" value={lang}>
              {meta || `${!lang ? 'Text' : uppercase(lang)}`}
            </button>
          );
        })}
      </div>
      <div className="CodeTabs-inner">{children}</div>
    </div>
  );
};

export default CodeTabs;
