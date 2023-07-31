const PropTypes = require('prop-types');
const React = require('react');

/*
 * To get around hast/html sanitation, we pass custom components through using
 * className's. Then this Div component, can render the associated component
 * instead. This used to be done with a custom `React.createElement`, but for
 * mdx@v1.5, I don't see a way to customize that.
 */

const Div = ({ components, ...props }) => {
  if (Object.keys(components).includes(props.className)) {
    const Component = components[props.className];
    return <Component {...props} />;
  }

  // eslint-disable-next-line react/jsx-props-no-spreading
  return <div {...props} />;
};

Div.propTypes = {
  children: PropTypes.arrayOf(PropTypes.any),
  className: PropTypes.string,
  components: PropTypes.object,
};

module.exports =
  (components, { theme }) =>
  props =>
    <Div components={components} theme={theme} {...props} />;
