const PropTypes = require('prop-types');
const React = require('react');

const Callout = props => {
  const { attributes, theme, icon } = props;
  const [title, content] = !props.title ? [null, props.children] : props.children;

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <blockquote {...attributes} className={`callout callout_${theme}`} theme={icon}>
      <h3 className={`callout-heading${title ? '' : ' empty'}`}>
        <span className="callout-icon">{icon}</span>
        {title}
      </h3>
      {content}
    </blockquote>
  );
};

Callout.propTypes = {
  attributes: PropTypes.shape({}),
  calloutStyle: PropTypes.string,
  children: PropTypes.arrayOf(PropTypes.any).isRequired,
  icon: PropTypes.string,
  node: PropTypes.shape(),
  theme: PropTypes.string,
  title: PropTypes.string,
};

Callout.defaultProps = {
  attributes: null,
  calloutStyle: 'info',
  node: null,
};

Callout.sanitize = sanitizeSchema => {
  sanitizeSchema.attributes['rdme-callout'] = ['icon', 'theme', 'title'];

  return sanitizeSchema;
};

module.exports = Callout;
