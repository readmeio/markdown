import React from 'react';
import GlossaryContext from './GlossaryTerms';
import BaseUrlContext from './BaseUrl';
import { VariablesContext } from '@readme/variable';
import { RunOpts } from '../index';

type Props = React.PropsWithChildren & Pick<RunOpts, 'baseUrl' | 'terms' | 'variables'>;

const compose = (
  children: React.ReactNode,
  ...contexts: [React.Context<typeof VariablesContext | typeof GlossaryContext>, unknown][]
) => {
  return contexts.reduce((content, [Context, value]) => {
    return <Context.Provider value={value}>{content}</Context.Provider>;
  }, children);
};

const Contexts = ({ children, terms = [], variables = { user: { keys: [] }, defaults: [] }, baseUrl = '/' }: Props) => {
  return compose(children, [GlossaryContext, terms], [VariablesContext, variables], [BaseUrlContext, baseUrl]);
};

export default Contexts;
