import debug from 'debug';
import React from 'react';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { VFile } from 'vfile';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';

import { createProcessor, compileSync, run as mdxRun, RunOptions, CompileOptions } from '@mdx-js/mdx';
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
import { unified } from 'unified';
import { VFileWithToc } from './types';

const unimplemented = debug('mdx:unimplemented');

type ComponentOpts = Record<string, (props: any) => React.ReactNode>;

interface Variables {
  user: { keys: string[] };
  defaults: { name: string; default: string }[];
}

export type CompileOpts = CompileOptions & {
  components?: Record<string, VFileWithToc>;
  lazyImages?: boolean;
  safeMode?: boolean;
};

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
    'table-of-contents': Components.TableOfContents,
  };

  return () => components;
};

const remarkPlugins = [remarkFrontmatter, remarkGfm, ...transformers];

export const reactProcessor = (opts = {}) => {
  return createProcessor({ remarkPlugins, ...opts });
};

export const compile = (text: string, opts: CompileOpts = {}) => {
  const { components } = opts;

  const exec = (string: string): VFileWithToc => {
    try {
      return compileSync(string, {
        outputFormat: 'function-body',
        providerImportSource: '#',
        remarkPlugins,
        rehypePlugins: [rehypeSlug, [rehypeToc, { components }]],
        ...opts,
      });
    } catch (error) {
      throw error.line ? new MdxSyntaxError(error, text) : error;
    }
  };

  const vfile = exec(text);
  if (vfile.data.toc.ast) {
    const toc = mdx(vfile.data.toc.ast, { hast: true });

    if (toc) {
      vfile.data.toc.vfile = exec(toc);
    }
  } else {
    delete vfile.data.toc;
  }

  vfile.value = String(vfile).replace(
    /await import\(_resolveDynamicMdxSpecifier\(('react'|"react")\)\)/,
    'arguments[0].imports.React',
  );

  console.log(vfile);
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

export const mdx = (tree: any, { hast = false, ...opts } = {}) => {
  const processor = unified()
    .use(hast ? rehypeRemark : undefined)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkStringify)
    .use(compilers);

  return processor.stringify(processor.runSync(tree));
};

const astProcessor = (opts: MdastOpts = { components: {} }) => remark().use(remarkMdx).use(remarkPlugins);

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
