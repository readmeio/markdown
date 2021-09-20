const React = require('react');
const PropTypes = require('prop-types');

const { uppercase } = require('@readme/syntax-highlighter');

const CodeTabs = props => {
  const { attributes, children, theme } = props;

  function handleClick({ target }, index) {
    const $wrap = target.parentElement.parentElement;
    const $open = [].slice.call($wrap.querySelectorAll('.CodeTabs_active'));
    $open.forEach(el => el.classList.remove('CodeTabs_active'));
    $wrap.classList.remove('CodeTabs_initial');

    const codeblocks = $wrap.querySelectorAll('pre');
    codeblocks[index].classList.add('CodeTabs_active');

    target.classList.add('CodeTabs_active');
  }

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <div {...attributes} className={`CodeTabs CodeTabs_initial theme-${theme}`}>
      <div className="CodeTabs-toolbar">
        {children.map(({ props: pre }, i) => {
          const { meta, lang } = pre.children[0].props;
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

CodeTabs.propTypes = {
  attributes: PropTypes.shape({}),
  children: PropTypes.arrayOf(PropTypes.any).isRequired,
  theme: PropTypes.string,
};

CodeTabs.defaultProps = {
  attributes: null,
};

function CreateCodeTabs({ theme }) {
  // eslint-disable-next-line react/display-name
  return props => <CodeTabs {...props} theme={theme} />;
}

module.exports = (_, opts) => CreateCodeTabs(opts);
