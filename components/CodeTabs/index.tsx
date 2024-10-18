import { uppercase } from '@readme/syntax-highlighter';
import React from 'react';
import mermaid from 'mermaid';

const CodeTabs = props => {
  const { children, theme } = props;

    // set Mermaid theme
    mermaid.initialize({
      theme: theme === 'dark' ? 'dark' : 'default',
    });

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
  if (!Array.isArray(children) && children.props.children.props.lang === 'mermaid') {
    const value = children.props.children.props.value;

    return (
      <pre className="mermaid">{value}</pre>
    )
  }

  return (
    <div className={`CodeTabs CodeTabs_initial theme-${theme}`}>
      <div className="CodeTabs-toolbar">
        {(Array.isArray(children) ? children : [children]).map((pre, i) => {
          const { meta, lang } = pre.props.children.props;

          /* istanbul ignore next */
          return (
            <button key={i} onClick={e => handleClick(e, i)} type="button">
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
