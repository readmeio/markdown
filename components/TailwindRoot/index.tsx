import React from 'react';

const TailwindRoot = ({ children, flow, name }) => {
  const Tag = flow ? 'div' : 'span';

  return <Tag className={name}>{children}</Tag>;
};

export default TailwindRoot;
