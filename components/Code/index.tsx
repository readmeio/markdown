import copy from 'copy-to-clipboard';
import React, { createRef, useContext } from 'react';

import RenderConfigContext from '../../contexts/RenderConfig';
import ThemeContext from '../../contexts/Theme';
import useHydrated from '../../hooks/useHydrated';

// Only load CodeMirror in the browser, for SSR
// apps. Necessary because of people like this:
// https://github.com/codemirror/CodeMirror/issues/3701#issuecomment-164904534
let syntaxHighlighter;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let canonicalLanguage = lang => '';

if (typeof window !== 'undefined') {
  // @ts-expect-error this library does not have any types defined
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
  children?: React.ReactNode;
  copyButtons?: boolean;
  lang?: string;
  meta?: string;
  theme?: string;
  value?: string;
}

const Code = (props: CodeProps) => {
  const { children, lang, value } = props;
  const theme = useContext(ThemeContext);
  const copyButtons = useContext(RenderConfigContext).copyButtons || props.copyButtons;
  const isHydrated = useHydrated();

  const language = canonicalLanguage(lang);
  const isMermaid = language === 'mermaid';

  const codeRef = createRef<HTMLElement>();

  const codeOpts = {
    inline: !lang,
    tokenizeVariables: true,
    dark: theme === 'dark',
  };

  // Markup inside an HTML `<code>` (e.g. <code>`hi`</code>) reaches us as elements, which the
  // highlighter renders empty, so those children render untouched instead.
  const hasMarkup = value === undefined && React.Children.toArray(children).some(child => typeof child !== 'string');
  const code = value ?? (Array.isArray(children) ? children[0] : children) ?? '';

  const highlightedCode =
    syntaxHighlighter && typeof syntaxHighlighter === 'function' && code && isHydrated
      ? syntaxHighlighter(code, language, codeOpts, { mdx: true })
      : code;
  const content = hasMarkup ? children : highlightedCode;

  if (isHydrated && isMermaid) {
    return code;
  }

  return (
    <>
      {copyButtons && <CopyCode className="fa" codeRef={codeRef} />}
      <code
        ref={codeRef}
        className={['rdmd-code', `lang-${language}`, `theme-${theme}`].join(' ')}
        data-lang={language}
      >
        {content}
      </code>
    </>
  );
};

export default Code;
