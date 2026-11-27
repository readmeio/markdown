import React, { useEffect, useMemo } from 'react';

import { extractScripts } from './extractScripts';

interface Props {
  children?: React.ReactElement | string;
  html?: string;
  runScripts?: boolean | string;
  safeMode?: boolean | string;
}

const HTMLBlock = ({ children = '', html: htmlProp, runScripts, safeMode: safeModeRaw = false }: Props) => {
  // Determine HTML source: MDXish uses html prop (from HAST), MDX uses children.
  // A non-string child (no html prop) can't be injected as raw HTML — see the
  // fail-soft fallback below.
  const htmlSource = htmlProp !== undefined ? htmlProp : children;
  const nonStringChildren = typeof htmlSource !== 'string';
  const html: string = nonStringChildren ? '' : htmlSource;

  runScripts = typeof runScripts !== 'boolean' ? runScripts === 'true' : runScripts;

  // In MDX mode, safeMode is passed in as a boolean from JSX parsing
  // In MDXish mode, safeMode comes in as a string from HAST props
  const safeMode = typeof safeModeRaw !== 'boolean' ? safeModeRaw === 'true' : safeModeRaw;

  // Memoised so `exec` is stable across rerenders and the effect below only runs when the html changes.
  const [cleanedHtml, exec] = useMemo((): [string, () => void] => {
    const extracted = extractScripts(html);
    return [
      extracted.html,
      () => {
        // eslint-disable-next-line no-eval
        extracted.scripts.forEach(js => window.eval(js));
      },
    ];
  }, [html]);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof runScripts === 'boolean' && runScripts && !safeMode) exec();
  }, [runScripts, safeMode, exec]);

  if (nonStringChildren) {
    // Fail soft: a non-string child (e.g. JSX that wasn't serialized back to a
    // raw string) should never throw, so render the child nodes directly
    return <div className="rdmd-html">{children}</div>;
  }

  if (safeMode) {
    return (
      <pre className="html-unsafe">
        <code>{html}</code>
      </pre>
    );
  }

  return <div className="rdmd-html" dangerouslySetInnerHTML={{ __html: cleanedHtml }} />;
};

export default HTMLBlock;
