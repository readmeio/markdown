const copy = require('copy-to-clipboard');
const PropTypes = require('prop-types');
const React = require('react');

const useColorScheme = require('../../hooks/useColorScheme');

// Only load CodeMirror in the browser, for SSR
// apps. Necessary because of people like this:
// https://github.com/codemirror/CodeMirror/issues/3701#issuecomment-164904534
let syntaxHighlighter;
let canonicalLanguage = () => {};
if (typeof window !== 'undefined') {
  // eslint-disable-next-line global-require
  syntaxHighlighter = require('@readme/syntax-highlighter').default;
  // eslint-disable-next-line global-require
  ({ canonical: canonicalLanguage } = require('@readme/syntax-highlighter'));
}

function CopyCode({ codeRef, rootClass = 'rdmd-code-copy', className = '' }) {
  const copyClass = `${rootClass}_copied`;
  const button = React.createRef();
  /* istanbul ignore next */
  const copier = () => {
    const code = codeRef.current.textContent;

    if (copy(code)) {
      const $el = button.current;
      $el.classList.add(copyClass);
      setTimeout(() => $el.classList.remove(copyClass), 1500);
    }
  };
  return <button ref={button} aria-label="Copy Code" className={`${rootClass} ${className}`} onClick={copier} />;
}

CopyCode.propTypes = {
  className: PropTypes.string,
  codeRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.instanceOf(React.Element) })])
    .isRequired,
  rootClass: PropTypes.string,
};

function Code(props) {
  const { children, className, copyButtons, lang, meta } = props;

  const langClass = className.search(/lang(?:uage)?-\w+/) >= 0 ? className.match(/\s?lang(?:uage)?-(\w+)/)[1] : '';
  const language = canonicalLanguage(lang) || langClass;

  const codeRef = React.createRef();

  const colorScheme = useColorScheme.default();

  const codeOpts = {
    customTheme: colorScheme === 'light' ? 'neo' : 'material-palenight',
    inline: !lang,
    tokenizeVariables: true,
  };

  const codeContent =
    syntaxHighlighter && children ? syntaxHighlighter(children[0], language, codeOpts) : children?.[0] || '';

  return (
    <React.Fragment>
      {copyButtons && <CopyCode className="fa" codeRef={codeRef} />}
      <code
        ref={codeRef}
        className={['rdmd-code', `lang-${language}`, `theme-${colorScheme}`].join(' ')}
        data-lang={language}
        name={meta}
        suppressHydrationWarning={true}
      >
        {codeContent}
      </code>
    </React.Fragment>
  );
}

function CreateCode({ copyButtons, theme }) {
  // eslint-disable-next-line react/display-name
  return props => <Code {...props} copyButtons={copyButtons} theme={theme} />;
}

Code.propTypes = {
  children: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
  copyButtons: PropTypes.bool,
  lang: PropTypes.string,
  meta: PropTypes.string,
  theme: PropTypes.string,
};

Code.defaultProps = {
  className: '',
  copyButtons: true,
  lang: '',
  meta: '',
};

CreateCode.sanitize = sanitizeSchema => {
  // This is for code blocks class name
  sanitizeSchema.attributes.code = ['className', 'lang', 'meta', 'value'];

  return sanitizeSchema;
};

module.exports = CreateCode;
