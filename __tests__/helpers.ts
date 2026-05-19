import type { Element, Nodes as HastNode, Root as HastRoot } from 'hast';
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

/**
 * Recursively searches a HAST tree for the first element matching the given
 * tag name. Returns `null` if no match is found.
 */
export function findElementByTagName(node: HastNode | HastRoot, tagName: string): Element | null {
  if ('type' in node && node.type === 'element' && 'tagName' in node && node.tagName === tagName) {
    return node;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.reduce<Element | null>((found, child) => {
      if (found) return found;
      return findElementByTagName(child, tagName);
    }, null);
  }
  return null;
}

/**
 * Recursively collects all elements matching the given tag name in a HAST tree.
 */
export function findAllElementsByTagName(node: HastNode | HastRoot, tagName: string): Element[] {
  const results: Element[] = [];
  if ('type' in node && node.type === 'element' && 'tagName' in node && node.tagName === tagName) {
    results.push(node);
  }
  if ('children' in node && Array.isArray(node.children)) {
    node.children.forEach(child => {
      results.push(...findAllElementsByTagName(child, tagName));
    });
  }
  return results;
}

/**
 * Parses markdown through the full mdxish pipeline (tokenize + transformers)
 * and returns both the MDAST tree and the post-preprocess source that was
 * actually parsed. Useful for position-based assertions that need to slice
 * the exact string the parser saw.
 */
export const parseMdxishWithSource = (
  doc: string,
  opts: MdxishOpts = {},
): { source: string; tree: MdastRoot } => {
  const { processor, parserReadyContent } = mdxishAstProcessor(doc, opts);
  const tree = processor.runSync(processor.parse(parserReadyContent)) as MdastRoot;
  return { source: parserReadyContent, tree };
};

/**
 * Parses markdown through the full mdxish pipeline and returns only the MDAST.
 */
export const parseMdxish = (doc: string, opts: MdxishOpts = {}): MdastRoot =>
  parseMdxishWithSource(doc, opts).tree;

/**
 * Walks a unist tree (mdast or hast) and returns every node that matches.
 * Wraps `unist-util-visit` so tests don't need to hand-roll tree walkers.
 *
 * The `test` argument can be either a type string (`collectNodes(tree, 'table')`)
 * or a predicate (`collectNodes(tree, n => n.type === 'foo' && n.name === 'bar')`).
 */
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
