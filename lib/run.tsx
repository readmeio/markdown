import React from 'react';
import * as runtime from 'react/jsx-runtime';

import { RunOptions, UseMdxComponents, run as mdxRun } from '@mdx-js/mdx';
import Variable from '@readme/variable';

import * as Components from '../components';
import Contexts from '../contexts';
import { GlossaryTerm } from '../contexts/GlossaryTerms';
import { Depth } from '../components/Heading';
import { tocToMdx } from '../processor/plugin/toc';
import compile from './compile';
import { CustomComponents, RMDXModule } from '../types';
import User, { Variables } from '../utils/user';

export type RunOpts = Omit<RunOptions, 'Fragment'> & {
  components?: CustomComponents;
  imports?: Record<string, unknown>;
  baseUrl?: string;
  terms?: GlossaryTerm[];
  variables?: Variables;
};

const makeUseMDXComponents = (more: ReturnType<UseMdxComponents> = {}): UseMdxComponents => {
  const headings = Array.from({ length: 6 }).reduce((map, _, index) => {
    map[`h${index + 1}`] = Components.Heading((index + 1) as Depth);
    return map;
  }, {});

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
    // @ts-expect-error
    ...headings,
    ...more,
  };

  return () => components;
};

const run = async (string: string, _opts: RunOpts = {}) => {
  const { Fragment } = runtime as any;
  const { components = {}, terms, variables, baseUrl, imports = {}, ...opts } = _opts;
  const exportedComponents = Object.entries(components).reduce((memo, [tag, mod]) => {
    const { default: Content, toc, Toc, stylesheets, ...rest } = mod;
    memo[tag] = Content;

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

  const { Toc: _Toc, toc, default: Content, stylesheet, ...exports } = await exec(string);

  let Toc: React.FC | undefined;
  const tocMdx = tocToMdx(toc, components);
  if (tocMdx) {
    const compiledToc = await compile(tocMdx);
    const tocModule = await exec(compiledToc, { useMDXComponents: () => ({ p: Fragment }) });

    Toc = tocModule.default;
  }

  return {
    default: props => (
      <Contexts terms={terms} baseUrl={baseUrl} variables={variables}>
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
  };
};

export default run;
