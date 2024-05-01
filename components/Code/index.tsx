import copy from 'copy-to-clipboard';
import React, { createRef, Element, Fragment } from 'react';

// Only load CodeMirror in the browser, for SSR
// apps. Necessary because of people like this:
// https://github.com/codemirror/CodeMirror/issues/3701#issuecomment-164904534
let syntaxHighlighter;
let canonicalLanguage = _ => '';
if (typeof window !== 'undefined') {
  // eslint-disable-next-line global-require
  syntaxHighlighter = require('@readme/syntax-highlighter').default;
  // eslint-disable-next-line global-require
  ({ canonical: canonicalLanguage } = require('@readme/syntax-highlighter'));
}

function CopyCode({ codeRef, rootClass = 'rdmd-code-copy', className = '' }) {
  const copyClass = `${rootClass}_copied`;
  const button = createRef();
  /* istanbul ignore next */
  const copier = () => {
    const code = codeRef.current.textContent;

    if (copy(code)) {
      const $el = button.current;
      $el.classList.add(copyClass);
      setTimeout(() => $el.classList.remove(copyClass), 1500);
    }
  };
  return <button ref={button} aria-label="Copy Code" className={`${rootClass} ${className}`} onClick={copier} />;
}

function Code(props) {
  const { children, copyButtons, lang, meta, theme, value } = props;

  const language = canonicalLanguage(lang);

  const codeRef = createRef();

  const codeOpts = {
    inline: !lang,
    tokenizeVariables: true,
    dark: theme === 'dark',
  };

  const code = value ?? children?.[0] ?? children ?? '';
  const highlightedCode = syntaxHighlighter && code ? syntaxHighlighter(code, language, codeOpts) : code;

  return (
    <>
      {copyButtons && <CopyCode className="fa" codeRef={codeRef} />}
      <code
        ref={codeRef}
        className={['rdmd-code', `lang-${language}`, `theme-${theme}`].join(' ')}
        data-lang={language}
        name={meta}
        suppressHydrationWarning={true}
      >
        {highlightedCode}
      </code>
    </>
  );
}

export default Code;
