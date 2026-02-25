import type { Element, Root, RootContent } from 'hast';

import * as rdmd from '@readme/markdown-legacy';

import { vi } from 'vitest';

import { run, compile, migrate as baseMigrate, mdastV6 } from '../index';
import { type RMDXModule } from '../types';

/** Recursively searches a hast tree and returns the first element matching the given tag name. */
export function findElementByTagName(node: Root | RootContent, tagName: string): Element | null {
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

/** Recursively searches a hast tree and returns all elements matching the given tag name. */
export function findElementsByTagName(node: Root | RootContent, tagName: string): Element[] {
  const results: Element[] = [];

  if ('type' in node && node.type === 'element' && 'tagName' in node && node.tagName === tagName) {
    results.push(node);
  }

  if ('children' in node && Array.isArray(node.children)) {
    node.children.forEach(child => {
      results.push(...findElementsByTagName(child, tagName));
    });
  }

  return results;
}

/** A minimal stub satisfying the RMDXModule interface. Use when tests need a component module without real rendering. */
export const stubModule = {
  default: () => null as unknown as React.JSX.Element,
  Toc: null,
  toc: [],
} satisfies RMDXModule;

/** Builds a component map from a list of names, each mapped to `stubModule`. Use to mock the components option in compile/run. */
export const makeComponents = (...names: string[]) =>
  names.reduce<Record<string, RMDXModule>>((acc, name) => {
    acc[name] = stubModule;
    return acc;
  }, {});

/** Temporarily suppresses console output for the given method (default: `error`) while executing a callback. Restores the original implementation afterward. */
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

/** Compiles and runs a markdown string through the full mdx pipeline. Returns the default export (React component) unless `getDefault` is false, in which case the full module is returned. */
export const execute = (doc: string, compileOpts = {}, runOpts = {}, { getDefault = true } = {}) => {
  const code = compile(doc, compileOpts);
  const mod = run(code, runOpts);

  return getDefault ? mod.default : mod;
};

/** Runs the legacy-to-v7 migration on a markdown string using the legacy rdmd parser. */
export const migrate = (doc: string) => {
  return baseMigrate(doc, { rdmd });
};

/** Parses a markdown string into an mdast tree using the v6-compatible parser with legacy rdmd support. */
export const mdastV6Wrapper = (doc: string) => {
  return mdastV6(doc, { rdmd });
};
