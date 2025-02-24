import React from 'react';

import { tailwindPrefix } from '../../utils/consts';

interface Props extends React.PropsWithChildren<{ flow: boolean }> {}

const TailwindRoot = ({ children, flow }: Props) => {
  const Tag = flow ? 'div' : 'span';

  return <Tag className={tailwindPrefix}>{children}</Tag>;
};

export default TailwindRoot;
