const { uppercase } = require('@readme/syntax-highlighter');
const React = require('react');
const { useState } = require('react');

const CodeTabs = props => {
  const { children, theme } = props;
  const [activeIndex, setActiveIndex] = useState(0);

  function handleClick({ target }, index) {
    const $wrap = target.parentElement.parentElement;
    const $open = [].slice.call($wrap.querySelectorAll('.CodeTabs_active'));
    $open.forEach(el => el.classList.remove('CodeTabs_active'));
    $wrap.classList.remove('CodeTabs_initial');

    const codeblocks = $wrap.querySelectorAll('pre');
    codeblocks[index].classList.add('CodeTabs_active');

    setActiveIndex(index);
  }

  return (
    <div className={`CodeTabs CodeTabs_initial theme-${theme}`}>
      <div className="CodeTabs-toolbar" role="tablist">
        {children.map(({ props: pre }, i) => {
          const { meta, lang } = pre.children[0].props;
          /* istanbul ignore next */
          return (
            <button
              key={i}
              aria-selected={activeIndex === i}
              className={activeIndex === i ? 'CodeTabs_active' : ''}
              onClick={e => handleClick(e, i)}
              role="tab"
              type="button"
            >
              {meta || `${!lang ? 'Text' : uppercase(lang)}`}
            </button>
          );
        })}
      </div>
      <div className="CodeTabs-inner" role="tabpanel">
        {children}
      </div>
    </div>
  );
};

function CreateCodeTabs({ theme }) {
  // eslint-disable-next-line react/display-name
  return props => <CodeTabs {...props} theme={theme} />;
}

module.exports = CreateCodeTabs;
module.exports.CodeTabs = CodeTabs;
