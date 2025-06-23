import type { Mermaid as MermaidType } from 'mermaid';

import React, { useContext, useEffect } from 'react';

import ThemeContext from '../../contexts/Theme';

import './style.scss';

interface Props extends React.PropsWithChildren {}

let mermaid: MermaidType;

const Mermaid = ({ children }: Props) => {
  const theme = useContext(ThemeContext);
  const content = children.props.children;
  console.log('children', children)
  console.log('content', content)

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
