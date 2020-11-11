/* eslint-disable no-eval,no-underscore-dangle
 */
const React = require('react');
const PropTypes = require('prop-types');

/**
 * @arg {string} html the HTML from which to extract script tags.
 */
const extractScripts = html => {
  if (typeof window === 'undefined' || !html) return [() => {}, ''];

  const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gim;
  const scripts = [...html.matchAll(regex)].map(m => m[1].trim());
  const cleaned = html.replace(regex, '') || '';
  const exec = () => scripts.map(js => window.eval(js));

  return [exec, cleaned];
};

class HTMLBlock extends React.Component {
  constructor(props) {
    super(props);
    [this.runScripts, this.clean] = extractScripts(this.props.html);
  }

  componentDidMount() {
    if ('scripts' in this.props) this.runScripts();
  }

  render() {
    const __html = this.clean;
    return <div className="rdmd-html" dangerouslySetInnerHTML={{ __html }} />;
  }
}

HTMLBlock.propTypes = {
  html: PropTypes.string,
  scripts: PropTypes.any,
};

module.exports = sanitize => {
  sanitize.tagNames.push('html-block');
  sanitize.attributes['html-block'] = ['html', 'scripts'];
  return HTMLBlock;
};
