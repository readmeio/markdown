const React = require('react');

function Heading({ align = '', id = '', level = 2, tag, showAnchorIcons = true, children }) {
  if (!children) return '';

  const attrs = {
    className: `heading heading-${level} header-scroll`,
    align,
  };

  const childrenWithAnchor = [
    <div key={`heading-anchor-${id}`} className="heading-anchor anchor waypoint" id={id} />,
    <div key={`heading-text-${id}`} className="heading-text">
      {children}
    </div>,
  ];

  if (showAnchorIcons) {
    const headingText = children[1];
    childrenWithAnchor.push(
      <a
        key={`heading-anchor-icon-${id}`}
        aria-label={`Skip link to ${headingText}`}
        className="heading-anchor-icon fa fa-anchor"
        href={`#${id}`}
      />,
    );
  }

  return React.createElement(tag, attrs, childrenWithAnchor);
}

function CreateHeading(level, { showAnchorIcons }) {
  // eslint-disable-next-line react/display-name
  return props => <Heading {...props} level={level} showAnchorIcons={showAnchorIcons} tag={`h${level}`} />;
}

module.exports = CreateHeading;
