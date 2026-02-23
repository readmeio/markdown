import { mdxish } from '../../../lib';

import { findElementsByTagName, stubModule } from './helpers';

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
        const components = {
          CustomButton: stubModule,
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
