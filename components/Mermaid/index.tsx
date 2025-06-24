import type { Mermaid as MermaidType } from 'mermaid';

import React, { useContext, useEffect, useRef } from 'react';

import ThemeContext from '../../contexts/Theme';

import './style.scss';

let mermaid: MermaidType;

const Mermaid = ({ children }: React.PropsWithChildren) => {
  const theme = useContext(ThemeContext);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('mermaid').then(async module => {
        mermaid = module.default;
        // Initialize Mermaid with the current theme
        mermaid.initialize({
          theme: theme === 'dark' ? 'dark' : 'default',
        });
      
        if (containerRef.current) {
          const code = containerRef.current.textContent || '';
          // Render the diagram and inject it into the container
          const { svg } = await mermaid.render('generatedDiagram', code);
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        }
      }) 
    }
  }, [children, theme]);

  return (
    <div ref={containerRef}>
      <pre className="Mermaid mermaid">
        {children}
      </pre>
    </div>
  );
};

export default Mermaid;
