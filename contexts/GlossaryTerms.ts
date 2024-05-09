import { ReactNode, createContext } from "react";

export type GlossaryTerm = {
  term: string;
  definition: string;
  _id?: string;
};

export type GlossaryItem = {
  term?: string;
  terms: GlossaryTerm[];
};

const GlossaryContext = createContext<GlossaryTerm[]>([]);

export default GlossaryContext;

// haxx
export function Provider(Provider: any, arg1: { value: GlossaryTerm[] }): ReactNode {
  throw new Error('Function not implemented.');
}

