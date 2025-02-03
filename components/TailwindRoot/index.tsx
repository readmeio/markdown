import React, { useState } from 'react';

import tailwindBundle from '../../utils/tailwind-bundle';

const TailwindRoot = ({ children, flow, source, name }) => {
  const Tag = flow ? 'div' : 'span';

  const [css, setCss] = useState('');

  React.useEffect(() => {
    const run = async () => {
      const css = await tailwindBundle(source, { prefix: `.${name}` });

      setCss(css.css);
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
