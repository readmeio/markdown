import type { GlossaryTerm } from '../contexts/GlossaryTerms';
import type { CustomComponents, RMDXModule } from '../types';
import type { Variables } from '../utils/user';
import type { RunOptions } from '@mdx-js/mdx';
import type { MDXProps } from 'mdx/types';

import { run as mdxRun } from '@mdx-js/mdx';
import React from 'react';
import * as runtime from 'react/jsx-runtime';

import * as Components from '../components';
import Contexts from '../contexts';
import { tocHastToMdx } from '../processor/plugin/toc';
import User from '../utils/user';

import compile from './compile';
import makeUseMDXComponents from './utils/makeUseMdxComponents';

export type RunOpts = Omit<RunOptions, 'Fragment'> & {
  baseUrl?: string;
  components?: CustomComponents;
  copyButtons?: boolean;
  imports?: Record<string, unknown>;
  terms?: GlossaryTerm[];
  theme?: 'dark' | 'light';
  variables?: Variables;
};

const run = async (string: string, _opts: RunOpts = {}) => {
  const { Fragment } = runtime;
  const { components = {}, terms, variables, baseUrl, imports = {}, theme, copyButtons, ...opts } = _opts;

  const tocsByTag: Record<string, RMDXModule['toc']> = {};
  const exportedComponents = Object.entries(components).reduce((memo, [tag, mod]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { default: Content, toc, Toc, ...rest } = mod;
    memo[tag] = Content;
    tocsByTag[tag] = toc;

    if (rest) {
      Object.entries(rest).forEach(([subTag, component]) => {
        memo[subTag] = component;
      });
    }

    return memo;
  }, {});

  const exec = (text: string, { useMDXComponents = makeUseMDXComponents(exportedComponents) }: RunOpts = {}) => {
    return mdxRun(text, {
      ...runtime,
      Fragment,
      baseUrl: import.meta.url,
      imports: { React, user: User(variables), ...imports },
      useMDXComponents,
      ...opts,
    } as RunOptions) as Promise<RMDXModule>;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { Toc: _Toc, toc, default: Content, stylesheet, ...exports } = await exec(string);

  let Toc: React.FC | undefined;
  const tocMdx = tocHastToMdx(toc, tocsByTag);
  if (tocMdx) {
    const compiledToc = await compile(tocMdx);
    const tocModule = await exec(compiledToc, { useMDXComponents: () => ({ p: Fragment }) });

    Toc = tocModule.default;
  }

  return {
    default: (props: MDXProps) => (
      <Contexts baseUrl={baseUrl} copyButtons={copyButtons} terms={terms} theme={theme} variables={variables}>
        <Content {...props} />
      </Contexts>
    ),
    toc,
    Toc: props =>
      Toc ? (
        <Components.TableOfContents>
          <Toc {...props} />
        </Components.TableOfContents>
      ) : null,
    stylesheet,
    ...exports,
  } as RMDXModule;
};

export default run;
