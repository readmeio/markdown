const { uppercase } = require('@readme/syntax-highlighter');
const PropTypes = require('prop-types');
const React = require('react');
const { useState } = require('react');

const traverseProps = (props, fn) => {
  if (!props) return;
  fn(props);

  if (props && 'children' in props) {
    if (Array.isArray(props.children)) {
      props.children.forEach(child => child.props && traverseProps(child.props, fn));
    } else {
      traverseProps(props.children.props, fn);
    }
  }
};

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

  const tabs = [];
  traverseProps(props, childProps => {
    if ('meta' in childProps || 'lang' in childProps) {
      tabs.push({ meta: childProps.meta, lang: childProps.lang });
    }
  });

  return (
    <div className={`CodeTabs CodeTabs_initial theme-${theme}`}>
      <div className="CodeTabs-toolbar" role="tablist">
        {tabs.map(({ meta, lang }, i) => {
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

CodeTabs.propTypes = {
  children: PropTypes.oneOf(PropTypes.arrayOf(PropTypes.any), PropTypes.object),
  theme: PropTypes.string,
};

function CreateCodeTabs({ theme }) {
  // eslint-disable-next-line react/display-name
  return props => <CodeTabs {...props} theme={theme} />;
}

CreateCodeTabs.sanitize = sanitizeSchema => {
  sanitizeSchema.attributes.div = ['className', 'tabs'];

  return sanitizeSchema;
};

module.exports = CreateCodeTabs;
module.exports.CodeTabs = CodeTabs;
