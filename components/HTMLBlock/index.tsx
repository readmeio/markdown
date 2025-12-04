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
  // Determine HTML source: MDXish uses html prop (from HAST), MDX uses children
  let html: string = '';
  if (htmlProp !== undefined) {
    html = htmlProp;
  } else {
    if (typeof children !== 'string') {
      throw new TypeError('HTMLBlock: children must be a string');
    }
    html = children;
  }

  // eslint-disable-next-line no-param-reassign
  runScripts = typeof runScripts !== 'boolean' ? runScripts === 'true' : runScripts;

  // In MDX mode, safeMode is passed in as a boolean from JSX parsing
  // In MDXish mode, safeMode comes in as a string from HAST props
  const safeMode = typeof safeModeRaw !== 'boolean' ? safeModeRaw === 'true' : safeModeRaw;

  const [cleanedHtml, exec] = extractScripts(html);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof runScripts === 'boolean' && runScripts) exec();
  }, [runScripts, exec]);

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
