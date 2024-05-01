import { uppercase } from '@readme/syntax-highlighter';
import React from 'react';

const CodeTabs = props => {
  const { children, theme } = props;

  function handleClick({ target }, index: number) {
    const $wrap = target.parentElement.parentElement;
    const $open = [].slice.call($wrap.querySelectorAll('.CodeTabs_active'));
    $open.forEach((el: Element) => el.classList.remove('CodeTabs_active'));
    $wrap.classList.remove('CodeTabs_initial');

    const codeblocks = $wrap.querySelectorAll('pre');
    codeblocks[index].classList.add('CodeTabs_active');

    target.classList.add('CodeTabs_active');
  }

  return (
    <div className={`CodeTabs CodeTabs_initial theme-${theme}`}>
      <div className="CodeTabs-toolbar">
        {children.map((pre, i) => {
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
