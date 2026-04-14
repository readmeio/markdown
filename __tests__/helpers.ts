import type { Node, Root as MdastRoot } from 'mdast';

import * as rdmd from '@readme/markdown-legacy';

import { visit } from 'unist-util-visit';

import { vi } from 'vitest';

import { run, compile, migrate as baseMigrate, mdastV6 } from '../index';
import { mdxishAstProcessor, type MdxishOpts } from '../lib/mdxish';

export const silenceConsole =
  (prop: keyof Console = 'error', impl = () => {}) =>
  fn => {
    const spy: ReturnType<typeof vi.spyOn> = vi.spyOn(console, prop);

    try {
      spy.mockImplementation(impl);

      return fn(spy);
    } finally {
      spy?.mockRestore();
    }
  };

export const execute = (doc: string, compileOpts = {}, runOpts = {}, { getDefault = true } = {}) => {
  const code = compile(doc, compileOpts);
  const mod = run(code, runOpts);

  return getDefault ? mod.default : mod;
};

export const migrate = (doc: string) => {
  return baseMigrate(doc, { rdmd });
};

export const mdastV6Wrapper = (doc: string) => {
  return mdastV6(doc, { rdmd });
};

export const parseMdxishMdast = (md: string, opts: MdxishOpts = {}): MdastRoot => {
  const { processor, parserReadyContent } = mdxishAstProcessor(md, opts);
  return processor.runSync(processor.parse(parserReadyContent)) as MdastRoot;
};

export const parseMdxishWithSource = (
  doc: string,
  opts: MdxishOpts = {},
): { source: string; tree: MdastRoot } => {
  const { processor, parserReadyContent } = mdxishAstProcessor(doc, opts);
  const tree = processor.runSync(processor.parse(parserReadyContent)) as MdastRoot;
  return { source: parserReadyContent, tree };
};

export const parseMdxish = (doc: string, opts: MdxishOpts = {}): MdastRoot =>
  parseMdxishWithSource(doc, opts).tree;

export const collectNodes = <T extends Node = Node>(
  tree: Node,
  test: string | ((node: Node) => boolean),
): T[] => {
  const out: T[] = [];
  const match = typeof test === 'string' ? (node: Node) => node.type === test : test;
  visit(tree, node => {
    if (match(node)) out.push(node as T);
  });
  return out;
};
