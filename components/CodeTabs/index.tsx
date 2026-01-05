import type { Mermaid } from 'mermaid';

import syntaxHighlighterUtils from '@readme/syntax-highlighter/utils';
import React, { useContext, useEffect } from 'react';

import ThemeContext from '../../contexts/Theme';

let mermaid: Mermaid;

const { uppercase } = syntaxHighlighterUtils;

interface Props {
  children: JSX.Element | JSX.Element[];
}

const CodeTabs = (props: Props) => {
  const { children } = props;
  const theme = useContext(ThemeContext);

  // Handle both array (rehype-react) and single element (MDX/JSX runtime) cases
  const childrenArray = Array.isArray(children) ? children : [children];
  const firstChild = childrenArray[0];
  const codeComponent = Array.isArray(firstChild?.props?.children)
    ? firstChild.props.children[0]
    : firstChild?.props?.children;

  const hasMermaid = childrenArray.length === 1 && codeComponent?.props?.lang === 'mermaid';

  // render Mermaid diagram
  useEffect(() => {
    if (typeof window !== 'undefined' && hasMermaid) {
      import('mermaid').then(module => {
        mermaid = module.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'dark' ? 'dark' : 'default',
        });
        mermaid.run({
          nodes: document.querySelectorAll('.mermaid-render'),
        });
      });
    }
  }, [hasMermaid, theme]);

  function handleClick({ target }, index: number) {
    const $wrap = target.parentElement.parentElement;
    const $open = [].slice.call($wrap.querySelectorAll('.CodeTabs_active'));
    $open.forEach((el: Element) => el.classList.remove('CodeTabs_active'));
    $wrap.classList.remove('CodeTabs_initial');

    const codeblocks = $wrap.querySelectorAll('pre');
    codeblocks[index].classList.add('CodeTabs_active');

    target.classList.add('CodeTabs_active');
  }

  // render single Mermaid diagram
  if (hasMermaid) {
    const value = codeComponent?.props?.value;
    return <pre className="mermaid-render mermaid_single">{value}</pre>;
  }

  return (
    <div className={`CodeTabs CodeTabs_initial theme-${theme}`}>
      <div className="CodeTabs-toolbar">
        {childrenArray.map((pre, i) => {
          // the first or only child should be our Code component
          const tabCodeComponent = Array.isArray(pre.props?.children)
            ? pre.props.children[0]
            : pre.props?.children;
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
