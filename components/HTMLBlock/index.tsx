import React, { useEffect } from 'react';

const MATCH_SCRIPT_TAGS = /<script\b[^>]*>([\s\S]*?)<\/script *>\n?/gim;

const extractScripts = (html: string = ''): [string, () => void] => {
  const scripts: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = MATCH_SCRIPT_TAGS.exec(html)) !== null) {
    scripts.push(match[1]);
  }
  const cleaned = html.replace(MATCH_SCRIPT_TAGS, '');
  // eslint-disable-next-line no-eval
  return [cleaned, () => scripts.map(js => window.eval(js))];
};

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

  // eslint-disable-next-line no-param-reassign
  runScripts = typeof runScripts !== 'boolean' ? runScripts === 'true' : runScripts;

  // In MDX mode, safeMode is passed in as a boolean from JSX parsing
  // In MDXish mode, safeMode comes in as a string from HAST props
  const safeMode = typeof safeModeRaw !== 'boolean' ? safeModeRaw === 'true' : safeModeRaw;

  const [cleanedHtml, exec] = extractScripts(html);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof runScripts === 'boolean' && runScripts) exec();
  }, [runScripts, exec]);

  if (nonStringChildren) {
    // Fail soft: a non-string child (e.g. JSX that wasn't serialized back to a
    // raw string) must never throw — an unhandled throw here bubbles to the
    // page-level error boundary and replaces the ENTIRE document (CX-3701).
    // Render the already-parsed child nodes directly so the failure stays
    // localized to this block and the rest of the page still renders.
    // eslint-disable-next-line no-console
    console.error('HTMLBlock: expected a string child; rendering children directly as a fallback.');
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
