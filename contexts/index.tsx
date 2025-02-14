import type { RunOpts } from '../lib/run';

import { VariablesContext } from '@readme/variable';
import React from 'react';

import BaseUrlContext from './BaseUrl';
import GlossaryContext from './GlossaryTerms';

type Props = Pick<RunOpts, 'baseUrl' | 'terms' | 'variables'> & React.PropsWithChildren;

const compose = (
  children: React.ReactNode,
  ...contexts: [React.Context<typeof GlossaryContext | typeof VariablesContext>, unknown][]
) => {
  return contexts.reduce((content, [Context, value]) => {
    return <Context.Provider value={value}>{content}</Context.Provider>;
  }, children);
};

const Contexts = ({ children, terms = [], variables = { user: {}, defaults: [] }, baseUrl = '/' }: Props) => {
  return compose(children, [GlossaryContext, terms], [VariablesContext, variables], [BaseUrlContext, baseUrl]);
};

export default Contexts;
