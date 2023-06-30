const PropTypes = require('prop-types');
const React = require('react');

const Div = ({ components, ...props }) => {
  if (Object.keys(components).includes(props.className)) {
    const Component = components[props.className];
    return <Component {...props} />;
  }
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <div {...props} />;
};

Div.propTypes = {
  children: PropTypes.arrayOf(PropTypes.any).isRequired,
  className: PropTypes.string,
  components: PropTypes.object,
};

module.exports = components => props => <Div components={components} {...props} />;
