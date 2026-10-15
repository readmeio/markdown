import syntaxHighlighterUtils from '@readme/syntax-highlighter/utils';
import React, { useContext } from 'react';

import ThemeContext from '../../contexts/Theme';
import MermaidDiagram from '../MermaidDiagram';

const { uppercase } = syntaxHighlighterUtils;

interface Props {
  children: JSX.Element | JSX.Element[];
}

const CodeTabs = (props: Props) => {
  const { children } = props;
  const theme = useContext(ThemeContext);

  // Handle both array (from rehype-react in rendering mdxish) and single element (MDX/JSX runtime) cases
  // The children here is the individual code block objects
  const childrenArray = Array.isArray(children) ? children : [children];

  // The structure varies depending on rendering context:
  // - When rendered via rehype-react: pre.props.children is an array where the first element is the Code component
  // - When rendered via MDX/JSX runtime: pre.props.children is directly the Code component
  const getCodeComponent = (pre: JSX.Element) => {
    return Array.isArray(pre?.props?.children) ? pre.props.children[0] : pre?.props?.children;
  };

  function handleClick({ target }, index: number) {
    const $wrap = target.parentElement.parentElement;
    const $open = [].slice.call($wrap.querySelectorAll('.CodeTabs_active'));
    $open.forEach((el: Element) => el.classList.remove('CodeTabs_active'));
    $wrap.classList.remove('CodeTabs_initial');

    const codeblocks = $wrap.querySelectorAll('pre');
    codeblocks[index].classList.add('CodeTabs_active');

    target.classList.add('CodeTabs_active');
  }

  // We want to render single mermaid diagrams without the code tabs UI
  if (childrenArray.length === 1) {
    const codeComponent = getCodeComponent(childrenArray[0]);
    if (codeComponent?.props?.lang === 'mermaid') {
      return <MermaidDiagram value={codeComponent.props.value} />;
    }
  }

  return (
    <div className={`CodeTabs CodeTabs_initial theme-${theme}`}>
      <div className="CodeTabs-toolbar">
        {childrenArray.map((pre, i) => {
          // the first or only child should be our Code component
          const tabCodeComponent = Array.isArray(pre.props?.children) ? pre.props.children[0] : pre.props?.children;
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
