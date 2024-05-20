import { createContext } from 'react';

export type GlossaryTerm = {
  term: string;
  definition: string;
  _id?: string;
};

const GlossaryContext = createContext<GlossaryTerm[]>([]);

export default GlossaryContext;
