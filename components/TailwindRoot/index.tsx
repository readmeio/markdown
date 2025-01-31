import React, { useState } from 'react';
import postcss from 'postcss';
import prefixer from 'postcss-prefix-selector';

import tailwindcss from '../../vendor/tailwindcss.js';

const TailwindRoot = ({ children, flow, source, name }) => {
  const Tag = flow ? 'div' : 'span';

  const [css, setCss] = useState('');

  React.useEffect(() => {
    const run = async () => {
      const css = await tailwindcss(source || '');
      const prefixed = await postcss([prefixer({ prefix: `.${name}` })]).process(css, { from: undefined });

      setCss(prefixed.css);
    };

    run();
  }, [source]);

  return (
    <>
      <style>{css}</style>
      <Tag className={name}>{children}</Tag>
    </>
  );
};

export default TailwindRoot;
