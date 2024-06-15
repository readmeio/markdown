import React, { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const MATCH_SCRIPT_TAGS = /<script\b[^>]*>([\s\S]*?)<\/script *>\n?/gim;

const extractScripts = (html: string = ''): [string, () => void] => {
  const scripts: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = MATCH_SCRIPT_TAGS.exec(html)) !== null) {
    scripts.push(match[1]);
  }
  const cleaned = html.replace(MATCH_SCRIPT_TAGS, '');
  return [cleaned, () => scripts.map(js => window.eval(js))];
};

const HTMLBlock = ({ children = '', runScripts, safeMode = false }) => {
  let html = children;
  runScripts = runScripts === 'true' ? true : false;

  if (typeof html !== 'string') html = renderToStaticMarkup(html);
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
