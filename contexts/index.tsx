import type {  RunOpts } from '../lib/run';

import { VariablesContext } from '@readme/variable';
import React, { useMemo } from 'react';

import BaseUrlContext from './BaseUrl';
import GlossaryContext from './GlossaryTerms';
import RenderConfigContext, { type RenderConfig } from './RenderConfig';
import ThemeContext from './Theme';

type Props = Pick<RunOpts, 'baseUrl' | 'terms' | 'theme' | 'variables'> & React.PropsWithChildren & RenderConfig;

const compose = (
  children: React.ReactNode,
  ...contexts: [React.Context<typeof GlossaryContext | typeof ThemeContext | typeof VariablesContext>, unknown][]
) => {
  return contexts.reduce((content, [Context, value]) => {
    return <Context.Provider value={value}>{content}</Context.Provider>;
  }, children);
};

const Contexts = ({
  children,
  terms = [],
  variables = { user: {}, defaults: [] },
  baseUrl = '/',
  theme,
  copyButtons,
  mermaidControls,
}: Props) => {
  // Stable value so unchanged flags don't trigger context re-renders (and re-highlighting) in consumers
  const renderConfig = useMemo(() => ({ copyButtons, mermaidControls }), [copyButtons, mermaidControls]);

  return compose(
    children,
    [GlossaryContext, terms],
    [VariablesContext, variables],
    [BaseUrlContext, baseUrl],
    [ThemeContext, theme],
    [RenderConfigContext, renderConfig],
  );
};

export default Contexts;
