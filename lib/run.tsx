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

interface Variables {
  user: Record<string, string>;
  defaults: { name: string; default: string }[];
}

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
    'code-tabs': Components.CodeTabs,
    'html-block': Components.HTMLBlock,
    embed: Components.Embed,
    img: Components.Image,
    table: Components.Table,
    // @ts-expect-error
    ...headings,
    ...more,
  };

  return () => components;
};

const run = async (string: string, _opts: RunOpts = {}) => {
  const { Fragment } = runtime as any;
  const { components = {}, terms, variables, baseUrl, ...opts } = _opts;
  const defaults = Object.fromEntries(Object.entries(components).map(([tag, module]) => [tag, module.default]));

  const exec = (text: string, { useMDXComponents = makeUseMDXComponents(defaults) }: RunOpts = {}) => {
    return mdxRun(text, {
      ...runtime,
      Fragment,
      baseUrl: import.meta.url,
      imports: { React },
      useMDXComponents,
      ...opts,
    }) as Promise<RMDXModule>;
  };

  const { toc, default: Content } = await exec(string);

  const tocMdx = tocToMdx(toc, components);
  const { default: Toc } = await exec(compile(tocMdx), { useMDXComponents: () => ({ p: Fragment }) });

  return {
    default: () => (
      <Contexts terms={terms} variables={variables} baseUrl={baseUrl}>
        <Content />
      </Contexts>
    ),
    toc,
    Toc: () =>
      tocMdx &&
      Toc && (
        <Components.TableOfContents>
          <Toc />
        </Components.TableOfContents>
      ),
  };
};

export default run;
