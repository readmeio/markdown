import type { MDXProps } from 'mdx/types';

import React from 'react';

import { mdxish } from '../../../lib';
import { type RMDXModule } from '../../../types';
import { findAllElementsByTagName } from '../../helpers';

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

      const tailwindRoots = findAllElementsByTagName(tree, 'TailwindRoot');
      expect(tailwindRoots).toHaveLength(0);
    });
  });

  describe('when useTailwind is true', () => {
    describe('readme built-in components', () => {
      it('should wrap Callout component with TailwindRoot', () => {
        const md = '<Callout>Hello</Callout>';
        const tree = mdxish(md, { useTailwind: true });

        const tailwindRoots = findAllElementsByTagName(tree, 'TailwindRoot');
        expect(tailwindRoots.length).toBeGreaterThanOrEqual(1);

        // Verify Callout is inside TailwindRoot
        const callout = findAllElementsByTagName(tailwindRoots[0], 'Callout');
        expect(callout.length).toBeGreaterThanOrEqual(1);
      });

      it('should wrap Cards component with TailwindRoot', () => {
        const md = '<Cards><Card>Item</Card></Cards>';
        const tree = mdxish(md, { useTailwind: true });

        const tailwindRoots = findAllElementsByTagName(tree, 'TailwindRoot');
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

        const tailwindRoots = findAllElementsByTagName(tree, 'TailwindRoot');
        expect(tailwindRoots.length).toBeGreaterThanOrEqual(1);

        // Verify CustomButton is inside TailwindRoot
        const customButton = findAllElementsByTagName(tailwindRoots[0], 'CustomButton');
        expect(customButton.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
