import React from 'react';

export type Depth = 1 | 2 | 3 | 4 | 5 | 6;

interface Props extends React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>> {
  depth: Depth;
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const Heading = ({ tag: Tag = 'h3', depth = 3, id, children, ...attrs }: Props) => {
  if (!children) return '';

  return (
    <Tag {...attrs} className={`heading heading-${depth} header-scroll`}>
      <div key={`heading-anchor-${id}`} className="heading-anchor anchor waypoint" id={id} />
      <div key={`heading-text-${id}`} className="heading-text">
        {children}
      </div>
      <a
        key={`heading-anchor-icon-${id}`}
        aria-label={`Skip link to ${children}`}
        className="heading-anchor-icon fa fa-regular fa-anchor"
        href={`#${id}`}
      />
    </Tag>
  );
};

const CreateHeading = (depth: Depth) => {
  const HeadingWithDepth = (props: Props) => <Heading {...props} depth={depth} tag={`h${depth}`} />;

  return HeadingWithDepth;
};

export default CreateHeading;
