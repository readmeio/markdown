import React from 'react';

export type Depth = 1 | 2 | 3 | 4 | 5 | 6;

const Heading = ({ tag: Tag = 'h3', depth = 3, id, children, ...attrs }: React.PropsWithChildren<HTMLHeadingElement>) => {
  if (!children) return '';

  return (
    <Tag {...attrs} className={`heading heading-${depth} header-scroll`}>
      <div key={`heading-anchor-${id}`} className="heading-anchor anchor waypoint" id={id} />
      <div key={`heading-text-${id}`} className="heading-text">
        {children}
      </div>
      <a
        key={`heading-anchor-icon-${id}`}
        aria-label={`Skip link to ${children[1]}`}
        className="heading-anchor-icon fa fa-anchor"
        href={`#${id}`}
      />
    </Tag>
  );
};

const CreateHeading = (depth: Depth) => props => <Heading {...props} depth={depth} Tag={`h${depth}`} />;

export default CreateHeading;
