import copy from 'copy-to-clipboard';
import React, { createRef, useContext } from 'react';

import CodeOptsContext from '../../contexts/CodeOpts';
import ThemeContext from '../../contexts/Theme';

// Only load CodeMirror in the browser, for SSR
// apps. Necessary because of people like this:
// https://github.com/codemirror/CodeMirror/issues/3701#issuecomment-164904534
let syntaxHighlighter;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let canonicalLanguage = lang => '';

if (typeof window !== 'undefined') {
  import('@readme/syntax-highlighter').then(module => {
    syntaxHighlighter = module.default;
    canonicalLanguage = module.canonical;
  });
}

function CopyCode({
  codeRef,
  rootClass = 'rdmd-code-copy',
  className = '',
}: {
  className?: string;
  codeRef: React.RefObject<HTMLElement>;
  rootClass?: string;
}) {
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
  const { children, lang, value } = props;
  const theme = useContext(ThemeContext);
  const copyButtons = useContext(CodeOptsContext) || props.copyButtons;

  const language = canonicalLanguage(lang);

  const codeRef = createRef<HTMLElement>();

  const codeOpts = {
    inline: !lang,
    tokenizeVariables: true,
    dark: theme === 'dark',
  };

  const code = value ?? (Array.isArray(children) ? children[0] : children) ?? '';
  const highlightedCode = syntaxHighlighter && code ? syntaxHighlighter(code, language, codeOpts, { mdx: true }) : code;

  if (language === 'mermaid') {
    return code;
  }

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
