import React, { useContext } from 'react';
import Tooltip from '@tippyjs/react';
import GlossaryContext from '../../contexts/GlossaryTerms';
import type { GlossaryItem, GlossaryTerm } from '../../contexts/GlossaryTerms';

const GlossaryItem = ({ term, terms }: { term: string; terms: GlossaryTerm[] }) => {
  const foundTerm = terms.find(i => term.toLowerCase() === i.term.toLowerCase());

  if (!foundTerm) return <span>{term}</span>;

  return (
    <Tooltip
      content={
        <div className="GlossaryItem-tooltip-content">
          <strong className="GlossaryItem-term">{foundTerm.term}</strong> - {foundTerm.definition}
        </div>
      }
      offset={[-5, 5]}
      placement="bottom-start"
    >
      <span className="GlossaryItem-trigger">{term}</span>
    </Tooltip>
  );
};

const GlossaryItemWithContext = props => {
  const terms = useContext(GlossaryContext);
  return terms ? <GlossaryItem {...props} terms={terms} /> : null;
};

export { GlossaryItem, GlossaryItemWithContext as default, GlossaryContext };
