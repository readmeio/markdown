import { createContext } from 'react';

export interface GlossaryTerm {
  _id?: string;
  definition: string;
  term: string;
}

const GlossaryContext = createContext<GlossaryTerm[]>([]);

export default GlossaryContext;
