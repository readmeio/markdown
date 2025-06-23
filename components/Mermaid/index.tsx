import type { Mermaid as MermaidType } from 'mermaid';

import React, { useContext, useEffect } from 'react';

import ThemeContext from '../../contexts/Theme';

import './style.scss';

let mermaid: MermaidType;

interface Props {
  children: JSX.Element;
}

const Mermaid = ({ children }: Props) => {
  const theme = useContext(ThemeContext);
  const content = children.props?.children || null;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('mermaid').then(module => {
        mermaid = module.default;
        mermaid.initialize({
          theme: theme === 'dark' ? 'dark' : 'default',
        });
        mermaid.contentLoaded();
      });
    }
    }, [theme]);

  return (
    <pre className="Mermaid mermaid">
      {content}
    </pre>
  );
};

export default Mermaid;
