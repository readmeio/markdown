const React = require('react');
const PropTypes = require('prop-types');

// Only load CodeMirror in the browser, for SSR
// apps. Necessary because of people like this:
// https://github.com/codemirror/CodeMirror/issues/3701#issuecomment-164904534
const syntaxHighlighter = typeof window !== 'undefined' ? require('@readme/syntax-highlighter').default : false;
const { canonical: canonicalLanguage } = require('@readme/syntax-highlighter');
const copy = require('copy-to-clipboard');

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
  const { children, className, copyButtons, lang, meta, theme } = props;

  const langClass = className.search(/lang(?:uage)?-\w+/) >= 0 ? className.match(/\s?lang(?:uage)?-(\w+)/)[1] : '';
  const language = canonicalLanguage(lang) || langClass;

  const codeRef = React.createRef();
  const codeOpts = {
    inline: !lang,
    tokenizeVariables: true,
    dark: theme === 'dark',
  };
  const codeContent = syntaxHighlighter ? syntaxHighlighter(children[0], language, codeOpts) : children[0];

  return (
    <React.Fragment>
      <code
        ref={codeRef}
        className={['rdmd-code', `lang-${language}`, `theme-${theme}`].join(' ')}
        data-lang={language}
        name={meta}
        suppressHydrationWarning={true}
      >
        {copyButtons && <CopyCode className="fa" codeRef={codeRef} />}
        {codeContent}
      </code>
    </React.Fragment>
  );
}

function CreateCode(sanitizeSchema, { copyButtons, theme }) {
  // This is for code blocks class name
  sanitizeSchema.attributes.code = ['className', 'lang', 'meta', 'value'];

  // eslint-disable-next-line react/display-name
  return props => <Code {...props} copyButtons={copyButtons} theme={theme} />;
}

Code.propTypes = {
  children: PropTypes.arrayOf(PropTypes.string).isRequired,
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

module.exports = (sanitizeSchema, opts) => CreateCode(sanitizeSchema, opts);
