import copy from 'copy-to-clipboard';
import React, { createRef } from 'react';
import mermaid from 'mermaid';

// Only load CodeMirror in the browser, for SSR
// apps. Necessary because of people like this:
// https://github.com/codemirror/CodeMirror/issues/3701#issuecomment-164904534
let syntaxHighlighter;
let canonicalLanguage = _ => '';

if (typeof window !== 'undefined') {
  import('@readme/syntax-highlighter').then(module => {
    syntaxHighlighter = module.default;
    canonicalLanguage = module.canonical;
  });
}

function CopyCode({ codeRef, rootClass = 'rdmd-code-copy', className = '' }) {
  const copyClass = `${rootClass}_copied`;
  const buttonRef = createRef<HTMLButtonElement>();

  const copier = () => {
    const code = codeRef.current.textContent;

    if (copy(code)) {
      const el = buttonRef.current;
      el.classList.add(copyClass);

      setTimeout(() => el.classList.remove(copyClass), 1500);
    }
  };

  return <button ref={buttonRef} aria-label="Copy Code" className={`${rootClass} ${className}`} onClick={copier} />;
}

interface CodeProps {
  children?: string[] | string;
  copyButtons?: boolean;
  lang?: string;
  meta?: string;
  theme?: string;
  value?: string;
}

const Code = (props: CodeProps) => {
  const { children, copyButtons, lang, theme, value } = props;

  const language = canonicalLanguage(lang);

  const codeRef = createRef<HTMLElement>();

  const codeOpts = {
    inline: !lang,
    tokenizeVariables: true,
    dark: theme === 'dark',
  };

  const code = value ?? (Array.isArray(children) ? children[0] : children) ?? '';
  const highlightedCode = syntaxHighlighter && code ? syntaxHighlighter(code, language, codeOpts, { mdx: true }) : code;

  return (
    <>
      {copyButtons && <CopyCode className="fa" codeRef={codeRef} />}
      <code
        ref={codeRef}
        className={['rdmd-code', `lang-${language}`, `theme-${theme}`].join(' ')}
        data-lang={language}
        suppressHydrationWarning={true}
      >
        {highlightedCode}
      </code>
    </>
  );
};

export default Code;
