import type { Element, Root, RootContent } from 'hast';

import { type RMDXModule } from '../../../types';

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
