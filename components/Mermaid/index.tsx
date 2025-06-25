import type { Mermaid as MermaidType } from 'mermaid';

import React, { useContext, useEffect, useState } from 'react';

import ThemeContext from '../../contexts/Theme';

import './style.scss';

let mermaid: MermaidType;

const Mermaid = ({ children }: React.PropsWithChildren) => {
  const theme = useContext(ThemeContext);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize Mermaid
    import('mermaid').then(async module => {
      if (!mermaid) {
        mermaid = module.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'dark' ? 'dark' : 'default',
        });
        mermaid.contentLoaded();
      }
    })
    
    // Set diagram content from component children
    if (React.isValidElement(children)) {
      setContent(children.props?.children || '');
    }
    
  }, [children, theme]);

  return (
    <pre className="Mermaid mermaid">
      {content}
    </pre>
  );
};

export default Mermaid;
