import React, { useContext, useRef } from 'react';

import RenderConfigContext from '../../contexts/RenderConfig';
import useMermaidRender from '../../hooks/useMermaidRender';

import ZoomableMermaidDiagram from './ZoomableMermaidDiagram';

const PlainMermaidDiagram = ({ value }: { value: string }) => {
  const mermaidRef = useRef<HTMLPreElement>(null);
  useMermaidRender(mermaidRef);

  return (
    <pre ref={mermaidRef} className="mermaid-render mermaid_single">
      {value}
    </pre>
  );
};

/** Single mermaid diagram; the `mermaidControls` option opts into zoom and drag-to-pan. */
const MermaidDiagram = ({ value }: { value: string }) => {
  const { mermaidControls } = useContext(RenderConfigContext);
  const Diagram = mermaidControls ? ZoomableMermaidDiagram : PlainMermaidDiagram;

  return <Diagram value={value} />;
};

export default MermaidDiagram;
