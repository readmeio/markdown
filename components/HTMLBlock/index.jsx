/* eslint-disable no-eval
 */
const React = require('react');
const PropTypes = require('prop-types');

const MATCH_SCRIPT_TAGS = /<script\b[^>]*>([\s\S]*?)<\/script *>\n?/gim;

const extractScripts = (html = '') => {
  const scripts = [];
  let match;
  while ((match = MATCH_SCRIPT_TAGS.exec(html)) !== null) {
    scripts.push(match[1]);
  }
  const cleaned = html.replace(MATCH_SCRIPT_TAGS, '');
  return [cleaned, () => scripts.map(js => window.eval(js))];
};

/**
 * @hack: https://stackoverflow.com/a/30930653/659661
 */
const escapeHTML = html => {
  return document.createElement('div').appendChild(document.createTextNode(html)).parentNode.innerHTML;
};

class HTMLBlock extends React.Component {
  constructor(props) {
    super(props);
    [this.html, this.exec] = extractScripts(this.props.html);
  }

  componentDidMount() {
    const { runScripts } = this.props;
    if (typeof window !== 'undefined' && (runScripts === '' || runScripts)) this.exec();
  }

  render() {
    const { html, safeMode } = this.props;

    if (safeMode) {
      return (
        <pre className="html-unsafe">
          <code>{escapeHTML(html)}</code>
        </pre>
      );
    }

    return <div className="rdmd-html" dangerouslySetInnerHTML={{ __html: this.html }} />;
  }
}

HTMLBlock.defaultProps = {
  runScripts: false,
  safeMode: false,
};

HTMLBlock.propTypes = {
  html: PropTypes.string,
  runScripts: PropTypes.any,
  safeMode: PropTypes.bool,
};

const CreateHtmlBlock =
  ({ safeMode }) =>
  // eslint-disable-next-line react/display-name
  props =>
    <HTMLBlock {...props} safeMode={safeMode} />;

module.exports = (sanitize, opts) => {
  sanitize.tagNames.push('html-block');
  sanitize.attributes['html-block'] = ['html', 'runScripts'];

  return CreateHtmlBlock(opts);
};
