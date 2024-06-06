import React from 'react';
import * as runtime from 'react/jsx-runtime';

import { RunOptions, UseMdxComponents, run as mdxRun } from '@mdx-js/mdx';
import Variable from '@readme/variable';

import * as Components from '../components';
import Contexts from '../contexts';
import { GlossaryTerm } from '../contexts/GlossaryTerms';
import { Depth } from '../components/Heading';
import { visit } from 'unist-util-visit';
import { tocToHast } from '../processor/plugin/toc';
import compile from './compile';
import mdx from './mdx';
import { MDXModule } from 'mdx/types';
import { Root } from 'hast';
import { HastHeading, IndexableElements } from 'types';

interface Variables {
  user: Record<string, string>;
  defaults: { name: string; default: string }[];
}

type CompiledComponents = Record<string, string>;

export type RunOpts = Omit<RunOptions, 'Fragment'> & {
  components?: CompiledComponents;
  imports?: Record<string, unknown>;
  baseUrl?: string;
  terms?: GlossaryTerm[];
  variables?: Variables;
};

interface RMDXModule extends MDXModule {
  toc: IndexableElements[];
}

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

  const exec = (text: string, __opts: RunOpts = {}) => {
    const { useMDXComponents } = __opts;

    return mdxRun(text, {
      ...runtime,
      Fragment,
      baseUrl: import.meta.url,
      imports: { React },
      ...__opts,
      useMDXComponents: useMDXComponents ?? makeUseMDXComponents(),
      ...opts,
    }) as Promise<RMDXModule>;
  };

  const promises = Object.entries(components).map(async ([tag, body]) => [tag, await exec(body)] as const);

  const CustomComponents: Record<string, RMDXModule> = {};
  (await Promise.all(promises)).forEach(([tag, node]) => {
    CustomComponents[tag] = node;
  });

  const { toc, default: Content } = await exec(string, {
    useMDXComponents: makeUseMDXComponents(
      Object.fromEntries(Object.entries(CustomComponents).map(([tag, module]) => [tag, module.default])),
    ),
  });

  const tree: Root = { type: 'root', children: toc };
  visit(tree, 'mdxJsxFlowElement', (node, index, parent) => {
    parent.children.splice(index, 1, ...CustomComponents[node.name].toc);
  });

  const tocHast = tocToHast(tree.children as HastHeading[]);
  const tocMdx = mdx(tocHast, { hast: true });
  const { default: Toc } = await exec(compile(tocMdx), { useMDXComponents: makeUseMDXComponents({ p: Fragment }) });

  return {
    default: () => (
      <Contexts terms={terms} variables={variables} baseUrl={baseUrl}>
        <Content />
      </Contexts>
    ),
    Toc: () =>
      Toc && (
        <Components.TableOfContents>
          <Toc />
        </Components.TableOfContents>
      ),
  };
};

export default run;
