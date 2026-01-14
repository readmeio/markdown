import type { Element, Root } from 'hast';
import type { MDXProps } from 'mdx/types';

import React from 'react';

import { mdxish } from '../../../lib';
import { type RMDXModule } from '../../../types';

/**
 * Helper to find all elements with a specific tag name in the HAST tree.
 */
const findElementsByTagName = (node: Element | Root, tagName: string): Element[] => {
  const results: Element[] = [];

  if (node.type === 'element' && node.tagName === tagName) {
    results.push(node);
  }

  if ('children' in node && Array.isArray(node.children)) {
    node.children.forEach(child => {
      if (child.type === 'element') {
        results.push(...findElementsByTagName(child, tagName));
      }
    });
  }

  return results;
};

const stubModule = (component: React.FC<MDXProps>): RMDXModule => ({
  default: component as RMDXModule['default'],
  Toc: null,
  toc: [],
});

describe('mdxish tailwind transformer', () => {
  describe('when useTailwind is not set', () => {
    it('should not wrap components with TailwindRoot', () => {
      const md = '<Callout>Hello</Callout>';
      const tree = mdxish(md);

      const tailwindRoots = findElementsByTagName(tree, 'TailwindRoot');
      expect(tailwindRoots).toHaveLength(0);
    });
  });

  describe('when useTailwind is true', () => {
    describe('readme built-in components', () => {
      it('should wrap Callout component with TailwindRoot', () => {
        const md = '<Callout>Hello</Callout>';
        const tree = mdxish(md, { useTailwind: true });

        const tailwindRoots = findElementsByTagName(tree, 'TailwindRoot');
        expect(tailwindRoots.length).toBeGreaterThanOrEqual(1);

        // Verify Callout is inside TailwindRoot
        const callout = findElementsByTagName(tailwindRoots[0], 'Callout');
        expect(callout.length).toBeGreaterThanOrEqual(1);
      });

      it('should wrap Cards component with TailwindRoot', () => {
        const md = '<Cards><Card>Item</Card></Cards>';
        const tree = mdxish(md, { useTailwind: true });

        const tailwindRoots = findElementsByTagName(tree, 'TailwindRoot');
        expect(tailwindRoots.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('passed-in custom components', () => {
      it('should wrap custom component with TailwindRoot', () => {
        const CustomButton: React.FC<MDXProps> = props =>
          React.createElement('button', { className: 'custom-btn' }, props.children as React.ReactNode);

        const components = {
          CustomButton: stubModule(CustomButton),
        };

        const md = '<CustomButton>Click me</CustomButton>';
        const tree = mdxish(md, { components, useTailwind: true });

        const tailwindRoots = findElementsByTagName(tree, 'TailwindRoot');
        expect(tailwindRoots.length).toBeGreaterThanOrEqual(1);

        // Verify CustomButton is inside TailwindRoot
        const customButton = findElementsByTagName(tailwindRoots[0], 'CustomButton');
        expect(customButton.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
