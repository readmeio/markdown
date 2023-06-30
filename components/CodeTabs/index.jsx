const { uppercase } = require('@readme/syntax-highlighter');
const PropTypes = require('prop-types');
const React = require('react');

const traverseProps = (props, fn) => {
  if (props?.children) {
    if (props.children.forEach) {
      props.children.forEach(child => {
        if (child.props) {
          traverseProps(child.props, fn);
        }
      });
    } else {
      fn(props.children.props);
    }
  }

  fn(props);
};

const CodeTabs = props => {
  const { children, theme } = props;

  function handleClick({ target }, index) {
    const $wrap = target.parentElement.parentElement;
    const $open = [].slice.call($wrap.querySelectorAll('.CodeTabs_active'));
    $open.forEach(el => el.classList.remove('CodeTabs_active'));
    $wrap.classList.remove('CodeTabs_initial');

    const codeblocks = $wrap.querySelectorAll('pre');
    codeblocks[index].classList.add('CodeTabs_active');

    target.classList.add('CodeTabs_active');
  }

  const tabs = [];
  traverseProps(props, childProps => {
    if ('meta' in childProps || 'lang' in childProps) {
      tabs.push({ meta: childProps.meta, lang: childProps.lang });
    }
  });

  return (
    <div className={`CodeTabs CodeTabs_initial theme-${theme}`}>
      <div className="CodeTabs-toolbar">
        {tabs.map(({ meta, lang }, i) => {
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
  children: PropTypes.arrayOf(PropTypes.any).isRequired,
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
