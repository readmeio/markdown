import React from 'react';

export type Depth = 1 | 2 | 3 | 4 | 5 | 6;

const CreateHeading = (depth: Depth) => {
  const Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' = `h${depth}`;

  const Heading = ({ id, children, ...attrs }: React.PropsWithChildren<HTMLHeadingElement>) => {
    if (!children) return '';

    return (
      // @ts-expect-error
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

  return Heading;
};

export default CreateHeading;
