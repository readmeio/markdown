import React, { useState } from 'react';

const TailwindRoot = ({ children, flow }) => {
  const Tag = flow ? 'div' : 'span';

  return <Tag shadowrootmode="open">{children}</Tag>;
};

export default TailwindRoot;
