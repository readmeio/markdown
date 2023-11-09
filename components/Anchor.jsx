const PropTypes = require('prop-types');
const React = require('react');

const BaseUrlContext = require('../contexts/BaseUrl');

// Nabbed from here:
// https://github.com/readmeio/api-explorer/blob/0dedafcf71102feedaa4145040d3f57d79d95752/packages/api-explorer/src/lib/markdown/renderer.js#L52
function getHref(href, baseUrl) {
  const [path, hash] = href.split('#');
  const hashStr = hash ? `#${hash}` : '';

  const base = baseUrl === '/' ? '' : baseUrl;
  const doc = path.match(/^doc:([-_a-zA-Z0-9#]*)$/);

  if (doc) {
    return `${base}/docs/${doc[1]}${hashStr}`;
  }

  const ref = path.match(/^ref:([-_a-zA-Z0-9#]*)$/);
  if (ref) {
    return `${base}/reference/${ref[1]}${hashStr}`;
  }

  // we need to perform two matches for changelogs in case
  // of legacy links that use 'blog' instead of 'changelog'
  const blog = path.match(/^blog:([-_a-zA-Z0-9#]*)$/);
  const changelog = path.match(/^changelog:([-_a-zA-Z0-9#]*)$/);
  const changelogMatch = blog || changelog;
  if (changelogMatch) {
    return `${base}/changelog/${changelogMatch[1]}${hashStr}`;
  }

  const custompage = path.match(/^page:([-_a-zA-Z0-9#]*)$/);
  if (custompage) {
    return `${base}/page/${custompage[1]}${hashStr}`;
  }

  return href;
}

function docLink(href) {
  const doc = href.match(/^doc:([-_a-zA-Z0-9#]*)$/);
  if (!doc) return false;

  return {
    className: 'doc-link',
    'data-sidebar': doc[1],
  };
}

function Anchor(props) {
  const { baseUrl, children, href, target, title, ...attrs } = props;
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <a {...attrs} href={getHref(href, baseUrl)} target={target} title={title} {...docLink(href)}>
      {children}
    </a>
  );
}

Anchor.propTypes = {
  baseUrl: PropTypes.string,
  children: PropTypes.node.isRequired,
  download: PropTypes.string,
  href: PropTypes.string,
  target: PropTypes.string,
  title: PropTypes.string,
};

Anchor.defaultProps = {
  baseUrl: '/',
  href: '',
  target: '',
  title: '',
};

const AnchorWithContext = props => (
  <BaseUrlContext.Consumer>{baseUrl => <Anchor baseUrl={baseUrl} {...props} />}</BaseUrlContext.Consumer>
);

AnchorWithContext.sanitize = sanitizeSchema => {
  // This is for our custom link formats
  sanitizeSchema.protocols.href.push('doc', 'target', 'ref', 'blog', 'changelog', 'page');

  return sanitizeSchema;
};

module.exports = AnchorWithContext;

AnchorWithContext.getHref = getHref;
