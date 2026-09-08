import React from 'react';

import { tailwindPrefix } from '../../utils/consts';

interface Props extends React.PropsWithChildren<{ flow: boolean }> {}

const TailwindRoot = ({ children, flow }: Props) => {
  // `styles/gfm.scss` spaces the wrapped block children through this element and
  // relies on their margins collapsing through it. Keep it a plain block — no
  // border, padding, or block formatting context (overflow, display: flow-root/
  // flex/grid) — or the spacing breaks.
  const Tag = flow ? 'div' : 'span';

  return <Tag className={tailwindPrefix}>{children}</Tag>;
};

export default TailwindRoot;
