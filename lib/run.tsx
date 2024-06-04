import React from 'react';
import { VFile } from 'vfile';
import * as runtime from 'react/jsx-runtime';

import { RunOptions, run as mdxRun } from '@mdx-js/mdx';
import Variable from '@readme/variable';

import * as Components from '../components';
import Contexts from '../contexts';
import { VFileWithToc } from '../types';
import { GlossaryTerm } from '../contexts/GlossaryTerms';
import { Depth } from '../components/Heading';

interface Variables {
  user: Record<string, string>;
  defaults: { name: string; default: string }[];
}

export type RunOpts = Omit<RunOptions, 'Fragment'> & {
  components?: ComponentOpts;
  imports?: Record<string, unknown>;
  baseUrl?: string;
  terms?: GlossaryTerm[];
  variables?: Variables;
};

type ComponentOpts = Record<string, (props: any) => React.ReactNode>;

const makeUseMDXComponents = (more: RunOpts['components']): (() => ComponentOpts) => {
  const headings = Array.from({ length: 6 }).reduce((map, _, index) => {
    map[`h${index + 1}`] = Components.Heading((index + 1) as Depth);
    return map;
  }, {});

  const components = {
    ...more,
    ...Components,
    Variable,
    code: Components.Code,
    'code-tabs': Components.CodeTabs,
    'html-block': Components.HTMLBlock,
    embed: Components.Embed,
    img: Components.Image,
    table: Components.Table,
    'table-of-contents': Components.TableOfContents,
    // @ts-expect-error
    ...headings,
  };

  return () => components;
};

const run = async (stringOrFile: string | VFileWithToc, _opts: RunOpts = {}) => {
  const { Fragment } = runtime as any;
  const { components, terms, variables, baseUrl, ...opts } = _opts;
  const vfile = new VFile(stringOrFile) as VFileWithToc;

  const exec = (file: VFile | string) =>
    mdxRun(file, {
      ...runtime,
      Fragment,
      baseUrl: import.meta.url,
      imports: { React },
      useMDXComponents: makeUseMDXComponents(components),
      ...opts,
    });

  const file = await exec(vfile);
  const Content = file.default;
  const { default: Toc } = 'toc' in vfile.data ? await exec(vfile.data.toc.vfile) : { default: null };

  return {
    default: () => (
      <Contexts terms={terms} variables={variables} baseUrl={baseUrl}>
        <Content />
      </Contexts>
    ),
    toc: () =>
      Toc && (
        <Components.TableOfContents>
          <Toc />
        </Components.TableOfContents>
      ),
  };
};

export default run;
