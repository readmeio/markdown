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
  // Use html prop if provided (from HAST properties), otherwise extract from children
  let html: string = '';
  if (htmlProp !== undefined) {
    html = htmlProp;
  } else if (typeof children === 'string') {
    html = children;
  } else {
    // Extract string from React children (text nodes)
    const textContent = React.Children.toArray(children)
      .map(child => (typeof child === 'string' ? child : ''))
      .join('');
    html = textContent;
  }
  // eslint-disable-next-line no-param-reassign
  runScripts = typeof runScripts !== 'boolean' ? runScripts === 'true' : runScripts;
  const safeMode = typeof safeModeRaw === 'boolean' ? safeModeRaw : safeModeRaw === 'true';

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
