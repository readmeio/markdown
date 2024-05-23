import debug from 'debug';
import React from 'react';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { VFile } from 'vfile';

import { createProcessor, compileSync, run as mdxRun, RunOptions } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';

import Variable from '@readme/variable';
import * as Components from './components';
import { getHref } from './components/Anchor';
import { options } from './options';

import transformers, { readmeComponentsTransformer, rehypeToc } from './processor/transform';
import compilers from './processor/compile';
import MdxSyntaxError from './errors/mdx-syntax-error';
import Contexts from './contexts';
import { GlossaryTerm } from './contexts/GlossaryTerms';

const unimplemented = debug('mdx:unimplemented');

type ComponentOpts = Record<string, (props: any) => React.ReactNode>;

interface Variables {
  user: { keys: string[] };
  defaults: { name: string; default: string }[];
}

export type RunOpts = Omit<RunOptions, 'Fragment'> & {
  components?: ComponentOpts;
  imports?: Record<string, unknown>;
  baseUrl?: string;
  terms?: GlossaryTerm[];
  variables?: Variables;
};

type MdastOpts = {
  components?: Record<string, string>;
};

type VFileWithToc = VFile & {
  data: VFile['data'] & { toc?: VFile };
};

export { Components };

export const utils = {
  get options() {
    return { ...options };
  },

  getHref,
  calloutIcons: {},
};

const makeUseMDXComponents = (more: RunOpts['components']): (() => ComponentOpts) => {
  const components = {
    ...more,
    ...Components,
    Variable,
    code: Components.Code,
    'code-tabs': Components.CodeTabs,
    'html-block': Components.HTMLBlock,
    img: Components.Image,
    table: Components.Table,
  };

  return () => components;
};

const remarkPlugins = [remarkFrontmatter, remarkGfm, ...transformers];
const rehypePlugins = [rehypeSlug, rehypeToc];

export const reactProcessor = (opts = {}) => {
  return createProcessor({ remarkPlugins, ...opts });
};

export const compile = (text: string, opts = {}) => {
  const exec = (string: string): VFileWithToc => {
    try {
      return compileSync(string, {
        outputFormat: 'function-body',
        providerImportSource: '#',
        remarkPlugins,
        rehypePlugins,
        ...opts,
      });
    } catch (error) {
      throw error.line ? new MdxSyntaxError(error, text) : error;
    }
  };

  const vfile = exec(text);
  console.log(vfile.data.toc);
  if (vfile.data.toc) {
    const toc = mdx(vfile.data.toc);
    vfile.data.toc = toc ? exec(toc) : null;
  } else {
    delete vfile.data.toc;
  }

  vfile.value = String(vfile).replace(
    /await import\(_resolveDynamicMdxSpecifier\(('react'|"react")\)\)/,
    'arguments[0].imports.React',
  );

  return vfile;
};

export const run = async (stringOrFile: string | VFileWithToc, _opts: RunOpts = {}) => {
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
  const toc = 'toc' in vfile.data ? await exec(vfile.data.toc) : { default: null };

  const Content = file.default;
  const body = () => (
    <Contexts terms={terms} variables={variables} baseUrl={baseUrl}>
      <Content />
    </Contexts>
  );

  return {
    default: body,
    toc: toc.default,
  };
};

const astProcessor = (opts: MdastOpts = { components: {} }) => remark().use(remarkMdx).use(remarkPlugins);

export const mdx = (tree: any, opts = {}) => {
  return remark().use(remarkMdx).use(remarkGfm).use(compilers).stringify(tree, opts);
};

export const html = (text: string, opts = {}) => {
  unimplemented('html export');
};

export const mdast: any = (text: string, opts: MdastOpts = {}) => {
  const processor = astProcessor(opts).use(readmeComponentsTransformer({ components: opts.components }));

  const tree = processor.parse(text);
  return processor.runSync(tree);
};

export const hast = (text: string, opts = {}) => {
  const processor = astProcessor(opts).use(remarkRehype);

  const tree = processor.parse(text);
  return processor.runSync(tree);
};

export const esast = (text: string, opts = {}) => {
  unimplemented('esast export');
};

export const plain = (text: string, opts = {}) => {
  unimplemented('plain export');
};
