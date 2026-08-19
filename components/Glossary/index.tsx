import type { GlossaryTerm } from '../../contexts/GlossaryTerms';

import Tooltip from '@tippyjs/react';
import React, { useContext } from 'react';

import GlossaryContext from '../../contexts/GlossaryTerms';

interface Props extends React.PropsWithChildren {
  term?: string;
  terms: GlossaryTerm[];
}

/** Tippy portals to document.body by default, which would break the
 *  `.rm-ReadMe[data-color-mode] …` descendant selectors in style.scss. */
const appendToReadMeRoot = (ref: Element) => ref.closest('.rm-ReadMe') ?? document.body;

const Glossary = ({ children, term: termProp, terms }: Props) => {
  const term = (Array.isArray(children) ? children[0] : children) || termProp;

  if (!term) return null;

  const foundTerm = terms.find(i => term.toLowerCase() === i?.term?.toLowerCase());

  if (!foundTerm) return <span>{term}</span>;

  return (
    <Tooltip
      appendTo={appendToReadMeRoot}
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

const GlossaryWithContext = (props: Omit<Props, 'terms'>) => {
  const terms = useContext(GlossaryContext);
  return terms ? <Glossary {...props} terms={terms} /> : <span>{props.term}</span>;
};

export { Glossary, GlossaryContext };

export default GlossaryWithContext;
