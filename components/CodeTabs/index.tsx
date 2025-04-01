import type { Mermaid } from 'mermaid';

import { uppercase } from '@readme/syntax-highlighter';
import React, { useContext, useEffect } from 'react';

import ThemeContext from 'contexts/Theme';

let mermaid: Mermaid;

interface Props {
  children: JSX.Element | JSX.Element[];
}

const CodeTabs = (props: Props) => {
  const { children } = props;
  const theme = useContext(ThemeContext);


  // render Mermaid diagram
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('mermaid').then(module => {
        mermaid = module.default;
        mermaid.initialize({
          theme: theme === 'dark' ? 'dark' : 'default',
        });
        mermaid.contentLoaded();
      });
    }
  }, [theme]);

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
  if (!Array.isArray(children) && children.props?.children.props.lang === 'mermaid') {
    const value = children.props.children.props.value;
    return <pre className="mermaid mermaid_single">{value}</pre>;
  }

  return (
    <div className={`CodeTabs CodeTabs_initial theme-${theme}`}>
      <div className="CodeTabs-toolbar">
        {(Array.isArray(children) ? children : [children]).map((pre, i) => {
          const { meta, lang } = pre.props.children.props;

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
