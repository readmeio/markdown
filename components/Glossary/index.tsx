import React, { useContext } from 'react';
import Tooltip from '@tippyjs/react';
import GlossaryContext from '../../contexts/GlossaryTerms';
import type { GlossaryTerm } from '../../contexts/GlossaryTerms';

const Glossary = ({ term, terms }: { term: string; terms: GlossaryTerm[] }) => {
  const foundTerm = terms.find(i => term.toLowerCase() === i?.term?.toLowerCase());

  if (!foundTerm) return <span>{term}</span>;

  return (
    <Tooltip
      content={
        <div className="Glossary-tooltip-content">
          <strong className="Glossary-term">{foundTerm.term}</strong> - {foundTerm.definition}
        </div>
      }
      offset={[-5, 5]}
      placement="bottom-start"
    >
      <span className="Glossary-trigger">{term}</span>
    </Tooltip>
  );
};

const GlossaryWithContext = props => {
  const terms = useContext(GlossaryContext);
  return terms ? <Glossary {...props} terms={terms} /> : <span>{props.term}</span>;
};

export { Glossary, GlossaryWithContext as default, GlossaryContext };
