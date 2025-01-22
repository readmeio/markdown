import React from 'react';
import root from 'react-shadow';

const TailwindRoot = ({ children, flow }) => {
  const Tag = flow ? root.div : root.span;

  return <Tag>{children}</Tag>;
};

export default TailwindRoot;
