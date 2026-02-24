import type { Element, Root, RootContent } from 'hast';

import * as rdmd from '@readme/markdown-legacy';

import { vi } from 'vitest';

import { run, compile, migrate as baseMigrate, mdastV6 } from '../index';
import { type RMDXModule } from '../types';

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

export const stubModule = {
  default: () => null,
  Toc: null,
  toc: [],
} as unknown as RMDXModule;

export const makeComponents = (...names: string[]) =>
  names.reduce<Record<string, RMDXModule>>((acc, name) => {
    acc[name] = stubModule;
    return acc;
  }, {});

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
