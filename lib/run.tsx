import type { Depth } from '../components/Heading';
import type { GlossaryTerm } from '../contexts/GlossaryTerms';
import type { CustomComponents, RMDXModule } from '../types';
import type { Variables } from '../utils/user';
import type { RunOptions, UseMdxComponents } from '@mdx-js/mdx';
import type { MDXComponents } from 'mdx/types';

import { run as mdxRun } from '@mdx-js/mdx';
import Variable from '@readme/variable';
import React from 'react';
import * as runtime from 'react/jsx-runtime';

import * as Components from '../components';
import Contexts from '../contexts';
import { tocHastToMdx } from '../processor/plugin/toc';
import User from '../utils/user';

import compile from './compile';

export type RunOpts = Omit<RunOptions, 'Fragment'> & {
  baseUrl?: string;
  components?: Record<string, string>;
  imports?: Record<string, unknown>;
  terms?: GlossaryTerm[];
  variables?: Variables;
};

const makeUseMDXComponents = (more: ReturnType<UseMdxComponents> = {}): UseMdxComponents => {
  const headings = Array.from({ length: 6 }).reduce((map, _, index) => {
    map[`h${index + 1}`] = Components.Heading((index + 1) as Depth);
    return map;
  }, {}) as MDXComponents;

  const components = {
    ...Components,
    Variable,
    code: Components.Code,
    embed: Components.Embed,
    img: Components.Image,
    table: Components.Table,
    'code-tabs': Components.CodeTabs,
    'embed-block': Components.Embed,
    'html-block': Components.HTMLBlock,
    'image-block': Components.Image,
    'table-of-contents': Components.TableOfContents,
    ...headings,
    ...more,
  };

  // @ts-expect-error I'm not sure how to coerce the correct type
  return () => components;
};

const run = async (string: string, _opts: RunOpts = {}) => {
  const { Fragment } = runtime;
  const { components = {}, terms, variables, baseUrl, imports = {}, ...opts } = _opts;

  const tocsByTag: Record<string, RMDXModule['toc']> = {};
  const promises: [string, RMDXModule][] = await Promise.all(
    Object.entries(components).map(async ([tag, body]) => {
      const code = await compile(body);
      const mod = await run(code);
      return [tag, mod];
    }),
  );

  const exportedComponents = promises.reduce((memo, [tag, mod]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { default: Content, toc, Toc, stylesheets, ...rest } = mod;

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
    default: props => (
      <Contexts baseUrl={baseUrl} terms={terms} variables={variables}>
        <Components.Style stylesheet={stylesheet} />
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
