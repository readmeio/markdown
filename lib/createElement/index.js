import React from 'react';

import { CodeTabs } from '../../components/CodeTabs';

const createElement = (type, props, ...children) => {
  const rdmdType = type === 'div' && props?.className === 'code-tabs' ? CodeTabs : type;

  return React.createElement(rdmdType, props, ...children);
};

export default createElement;
