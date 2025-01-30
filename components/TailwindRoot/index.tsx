import React from 'react';
import root from 'react-shadow';

import tailwindcss from '../../vendor/tailwindcss.js';

const TailwindRoot = ({ children, flow, source }) => {
  const Tag = flow ? root.div : root.span;

  const [stylesheet, setStylesheet] = React.useState('');

  React.useEffect(() => {
    const css = tailwindcss(source);

    setStylesheet(css);
  }, [source]);

  console.log(flow, source, stylesheet);

  return (
    <Tag ssr>
      <style>{stylesheet}</style>
      {children}
    </Tag>
  );
};

export default TailwindRoot;
