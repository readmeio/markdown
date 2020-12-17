/* eslint-disable no-eval
 */
const React = require('react');
const PropTypes = require('prop-types');

const MATCH_SCRIPT_TAGS = /<script\b[^>]*>([\s\S]*?)<\/script>\n?/gim;

const extractScripts = (html = '') => {
  const scripts = [...html.matchAll(MATCH_SCRIPT_TAGS)].map(m => m[1]);
  const cleaned = html.replace(MATCH_SCRIPT_TAGS, '');
  return [cleaned, () => scripts.map(js => window.eval(js))];
};

class HTMLBlock extends React.Component {
  constructor(props) {
    super(props);
    [this.html, this.exec] = extractScripts(this.props.html);
  }

  componentDidMount() {
    if (typeof window !== 'undefined' && this.props.runScripts) this.exec();
  }

  render() {
    return <div className="rdmd-html" dangerouslySetInnerHTML={{ __html: this.html }} />;
  }
}

HTMLBlock.defaultProps = {
  runScripts: false,
};

HTMLBlock.propTypes = {
  html: PropTypes.string,
  runScripts: PropTypes.any,
};

module.exports = sanitize => {
  sanitize.tagNames.push('html-block');
  sanitize.attributes['html-block'] = ['html', 'runScripts'];
  return HTMLBlock;
};
