const PropTypes = require('prop-types');
const React = require('react');

function Heading({ tag, showAnchorIcons, ...props }) {
  if (!props.children) return '';

  const attrs = {
    className: `heading heading-${props.level} header-scroll`,
    align: props.align,
  };

  const children = [
    <div key={`heading-anchor-${props.id}`} className="heading-anchor anchor waypoint" id={props.id} />,
    <div key={`heading-text-${props.id}`} className="heading-text">
      {props.children}
    </div>,
  ];

  if (showAnchorIcons) {
    const headingText = props.children[1];
    children.push(
      // eslint-disable-next-line jsx-a11y/anchor-has-content
      <a
        key={`heading-anchor-icon-${props.id}`}
        aria-label={`Skip link to ${headingText}`}
        className="heading-anchor-icon fa fa-anchor"
        href={`#${props.id}`}
      />,
    );
  }

  return React.createElement(tag, attrs, children);
}

function CreateHeading(level, { showAnchorIcons }) {
  // eslint-disable-next-line react/display-name
  return props => <Heading {...props} level={level} showAnchorIcons={showAnchorIcons} tag={`h${level}`} />;
}

Heading.propTypes = {
  align: PropTypes.oneOf(['left', 'center', 'right', '']),
  children: PropTypes.array.isRequired,
  id: PropTypes.string.isRequired,
  level: PropTypes.number,
  showAnchorIcons: PropTypes.bool,
  tag: PropTypes.string.isRequired,
};

Heading.defaultProps = {
  align: '',
  id: '',
  level: 2,
  showAnchorIcons: true,
};

module.exports = CreateHeading;
