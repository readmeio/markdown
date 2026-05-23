import type { GlossaryTerm } from '../../contexts/GlossaryTerms';
import React from 'react';
import GlossaryContext from '../../contexts/GlossaryTerms';
interface Props extends React.PropsWithChildren {
    term?: string;
    terms: GlossaryTerm[];
}
declare const Glossary: ({ children, term: termProp, terms }: Props) => React.JSX.Element;
declare const GlossaryWithContext: (props: Omit<Props, "terms">) => React.JSX.Element;
export { Glossary, GlossaryContext };
export default GlossaryWithContext;
