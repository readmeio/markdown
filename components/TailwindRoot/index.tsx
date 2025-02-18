import React from 'react';

interface Props extends React.PropsWithChildren<{ flow: boolean }> {}

const TailwindRoot = ({ children, flow }: Props) => {
  const Tag = flow ? 'div' : 'span';

  return <Tag className="readme-tailwind">{children}</Tag>;
};

export default TailwindRoot;
