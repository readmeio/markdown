import type {  RunOpts } from '../lib/run';

import { VariablesContext } from '@readme/variable';
import React from 'react';

import BaseUrlContext from './BaseUrl';
import CodeOptsContext from './CodeOpts';
import GlossaryContext from './GlossaryTerms';
import ThemeContext from './Theme';

type Props = Pick<RunOpts, 'baseUrl' | 'copyButtons' | 'terms' | 'theme' | 'variables'> & React.PropsWithChildren;

const compose = (
  children: React.ReactNode,
  ...contexts: [React.Context<typeof GlossaryContext | typeof ThemeContext | typeof VariablesContext>, unknown][]
) => {
  return contexts.reduce((content, [Context, value]) => {
    return <Context.Provider value={value}>{content}</Context.Provider>;
  }, children);
};

const Contexts = ({ children, terms = [], variables = { user: {}, defaults: [] }, baseUrl = '/', theme, copyButtons }: Props) => {
  return compose(children, [GlossaryContext, terms], [VariablesContext, variables], [BaseUrlContext, baseUrl], [ThemeContext, theme], [CodeOptsContext, copyButtons]);
};

export default Contexts;
