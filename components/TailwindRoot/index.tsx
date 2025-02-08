import React from 'react';

const TailwindRoot = ({ children, flow }) => {
  const Tag = flow ? 'div' : 'span';

  return <Tag className="readme-tailwind">{children}</Tag>;
};

export default TailwindRoot;
