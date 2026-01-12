import type { CustomComponents } from '../../../types';
import type { Element, Root, RootContent } from 'hast';

import { describe, it, expect } from 'vitest';

import { mix } from '../../../lib';
import { mdxish } from '../../../lib/mdxish';

describe('rehypeMdxishComponents', () => {
  it('should remove non-existent custom components from the tree', () => {
    const md = `<MyDemo> from inside </MyDemo>
Hello
<Custom>`;
    const html = mix(md);
    // Should only contain "Hello" and not the non-existent component tags or their content
    expect(html).toContain('Hello');
    expect(html).not.toContain('MyDemo');
    expect(html).not.toContain('from inside');
    expect(html).not.toContain('Custom');
  });

  it('should preserve existing custom components', () => {
    // componentExists only checks if the key exists, so we can use a minimal mock
    const TestComponent = {} as CustomComponents[string];
    const md = `<TestComponent>Content</TestComponent>
Hello`;
    const result = mix(md, { components: { TestComponent } });
    expect(result).toContain('TestComponent');
    expect(result).toContain('Hello');
  });

  it('should remove nested non-existent components', () => {
    const md = `<Outer>
  <Inner>nested content</Inner>
  Hello
</Outer>`;
    const result = mix(md);
    expect(result).not.toContain('Hello');
    expect(result).not.toContain('Outer');
    expect(result).not.toContain('Inner');
    expect(result).not.toContain('nested content');
  });

  it('should handle mixed existing and non-existent components', () => {
    // componentExists only checks if the key exists, so we can use a minimal mock
    const ExistingComponent = {} as CustomComponents[string];
    const md = `<ExistingComponent>Keep this</ExistingComponent>
<NonExistent>Remove this</NonExistent>
Hello`;
    const result = mix(md, { components: { ExistingComponent } });
    expect(result).toContain('ExistingComponent');
    expect(result).toContain('Keep this');
    expect(result).toContain('Hello');
    expect(result).not.toContain('NonExistent');
    expect(result).not.toContain('Remove this');
  });

  it('should preserve regular HTML tags', () => {
    const md = `<div>This is HTML</div>
<NonExistentComponent>Remove this</NonExistentComponent>
Hello`;
    const result = mix(md);
    expect(result).toContain('<div>');
    expect(result).toContain('This is HTML');
    expect(result).toContain('Hello');
    expect(result).not.toContain('NonExistentComponent');
    expect(result).not.toContain('Remove this');
  });

  it('should correctly handle real-life cases', () => {
    const md = `<MyDemoComponent message="Hello from MDX!">Hello world!</MyDemoComponent>
Reusable content should work the same way:
<ContentBlock />
hello
<ContentBlock2 />
<Outer>
  <Inner> from inside </Inner>
</Outer>`;
    const result = mix(md);
    expect(result).not.toContain('Hello world!');
    expect(result).toContain('Reusable content should work the same way:');
    expect(result).toContain('hello');
    expect(result).not.toContain('from inside');
  });
});

/**
 * Tests for smartCamelCase prop normalization.
 *
 * HTML lowercases attribute names, so `iconColor` becomes `iconcolor`.
 * The smartCamelCase function restores camelCase using known word boundaries.
 *
 * Regression test for: https://github.com/readmeio/markdown/issues/XXX
 * Bug: 'iconcolor' was becoming 'iconColOr' instead of 'iconColor'
 * Fix: Changed regex from case-insensitive ('gi') to case-sensitive ('g')
 */
describe('smartCamelCase (prop normalization)', () => {
  // Helper to find elements by tagName in HAST tree
  function findElementsByTagName(tree: Root | RootContent, tagName: string): Element[] {
    const elements: Element[] = [];

    if ('type' in tree && tree.type === 'element') {
      const elem = tree as Element;
      if (elem.tagName.toLowerCase() === tagName.toLowerCase()) {
        elements.push(elem);
      }
    }

    if ('children' in tree && Array.isArray(tree.children)) {
      tree.children.forEach(child => {
        elements.push(...findElementsByTagName(child as RootContent, tagName));
      });
    }

    return elements;
  }

  it('should preserve iconColor prop casing', () => {
    const TestComponent = {} as CustomComponents[string];
    const markdown = '<TestComponent iconColor="blue-500" />';
    const hast = mdxish(markdown, { components: { TestComponent } });

    const elements = findElementsByTagName(hast, 'TestComponent');
    expect(elements).toHaveLength(1);
    expect(elements[0].properties).toHaveProperty('iconColor', 'blue-500');
  });

  it('should not produce incorrect casing like iconColOr', () => {
    const TestComponent = {} as CustomComponents[string];
    const markdown = '<TestComponent iconColor="red" />';
    const hast = mdxish(markdown, { components: { TestComponent } });

    const elements = findElementsByTagName(hast, 'TestComponent');
    expect(elements).toHaveLength(1);

    // Should NOT have the buggy 'iconColOr' property
    expect(elements[0].properties).not.toHaveProperty('iconColOr');
    // Should have the correct 'iconColor' property
    expect(elements[0].properties).toHaveProperty('iconColor', 'red');
  });

  it('should handle backgroundColor prop', () => {
    const TestComponent = {} as CustomComponents[string];
    const markdown = '<TestComponent backgroundColor="#fff" />';
    const hast = mdxish(markdown, { components: { TestComponent } });

    const elements = findElementsByTagName(hast, 'TestComponent');
    expect(elements).toHaveLength(1);
    expect(elements[0].properties).toHaveProperty('backgroundColor', '#fff');
  });

  it('should handle onClick prop', () => {
    const TestComponent = {} as CustomComponents[string];
    const markdown = '<TestComponent onClick="handleClick" />';
    const hast = mdxish(markdown, { components: { TestComponent } });

    const elements = findElementsByTagName(hast, 'TestComponent');
    expect(elements).toHaveLength(1);
    expect(elements[0].properties).toHaveProperty('onClick', 'handleClick');
  });

  it('should handle className prop', () => {
    const TestComponent = {} as CustomComponents[string];
    const markdown = '<TestComponent className="my-class" />';
    const hast = mdxish(markdown, { components: { TestComponent } });

    const elements = findElementsByTagName(hast, 'TestComponent');
    expect(elements).toHaveLength(1);
    // Note: rehype stores className as an array
    expect(elements[0].properties).toHaveProperty('className');
    expect(elements[0].properties?.className).toContain('my-class');
  });

  it('should handle kebab-case props by converting to camelCase', () => {
    const TestComponent = {} as CustomComponents[string];
    const markdown = '<TestComponent data-testid="test" aria-label="label" />';
    const hast = mdxish(markdown, { components: { TestComponent } });

    const elements = findElementsByTagName(hast, 'TestComponent');
    expect(elements).toHaveLength(1);
    expect(elements[0].properties).toHaveProperty('dataTestid', 'test');
    expect(elements[0].properties).toHaveProperty('ariaLabel', 'label');
  });

  it('should handle multiple camelCase props together', () => {
    const TestComponent = {} as CustomComponents[string];
    const markdown = '<TestComponent iconColor="blue" backgroundColor="white" onClick="fn" />';
    const hast = mdxish(markdown, { components: { TestComponent } });

    const elements = findElementsByTagName(hast, 'TestComponent');
    expect(elements).toHaveLength(1);
    expect(elements[0].properties).toHaveProperty('iconColor', 'blue');
    expect(elements[0].properties).toHaveProperty('backgroundColor', 'white');
    expect(elements[0].properties).toHaveProperty('onClick', 'fn');
  });
});