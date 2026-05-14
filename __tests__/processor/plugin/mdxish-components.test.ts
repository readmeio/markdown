import type { CustomComponents } from '../../../types';
import type { Element, Root, RootContent } from 'hast';

import { describe, it, expect } from 'vitest';

import { mix, mdxish } from '../../../lib';

describe('rehypeMdxishComponents', () => {
  it('renders unresolved PascalCase tags as literal text instead of dropping them (CX-3284)', () => {
    const md = `<MyDemo> from inside </MyDemo>
Hello
<Custom>`;
    const html = mix(md);
    expect(html).toContain('Hello');
    expect(html).toContain('MyDemo');
    expect(html).toContain('from inside');
    expect(html).toContain('Custom');
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

  it('preserves nested unresolved components and their content as literal text', () => {
    const md = `<Outer>
  <Inner>nested content</Inner>
  Hello
</Outer>`;
    const result = mix(md);
    expect(result).toContain('Hello');
    expect(result).toContain('Outer');
    expect(result).toContain('Inner');
    expect(result).toContain('nested content');
  });

  it('handles mixed existing and non-existent components (renders unknown as text)', () => {
    const ExistingComponent = {} as CustomComponents[string];
    const md = `<ExistingComponent>Keep this</ExistingComponent>
<NonExistent>Show this</NonExistent>
Hello`;
    const result = mix(md, { components: { ExistingComponent } });
    expect(result).toContain('ExistingComponent');
    expect(result).toContain('Keep this');
    expect(result).toContain('Hello');
    expect(result).toContain('NonExistent');
    expect(result).toContain('Show this');
  });

  it('preserves regular HTML tags and renders unknown components as text alongside them', () => {
    const md = `<div>This is HTML</div>
<NonExistentComponent>Show this</NonExistentComponent>
Hello`;
    const result = mix(md);
    expect(result).toContain('<div>');
    expect(result).toContain('This is HTML');
    expect(result).toContain('Hello');
    expect(result).toContain('NonExistentComponent');
    expect(result).toContain('Show this');
  });

  it('should parse Image caption as markdown with decoded HTML entities', () => {
    const md = '<Image src="test.png" alt="test" caption="With **Default Handling** enabled, the `default` value &#x22;Buster&#x22; is used." />';
    const hast = mdxish(md);

    const imgElement = hast.children.find(
      (node): node is Element => node.type === 'element' && node.tagName === 'img',
    );
    expect(imgElement).toBeDefined();
    expect(imgElement!.children.length).toBeGreaterThan(0);

    const paragraph = imgElement!.children.find(
      (node): node is Element => node.type === 'element' && node.tagName === 'p',
    );
    expect(paragraph).toBeDefined();

    const strong = paragraph!.children.find(
      (node): node is Element => node.type === 'element' && node.tagName === 'strong',
    );
    expect(strong).toBeDefined();

    const code = paragraph!.children.find(
      (node): node is Element => node.type === 'element' && node.tagName === 'code',
    );
    expect(code).toBeDefined();
  });

  it('preserves all content even when mixing unknown components with real content (no silent drops)', () => {
    const md = `<MyDemoComponent message="Hello from MDX!">Hello world!</MyDemoComponent>
Reusable content should work the same way:
<ContentBlock />
hello
<ContentBlock2 />
<Outer>
  <Inner> from inside </Inner>
</Outer>`;
    const result = mix(md);
    expect(result).toContain('Hello world!');
    expect(result).toContain('Reusable content should work the same way:');
    expect(result).toContain('hello');
    expect(result).toContain('from inside');
  });
});

/**
 * Tests for smartCamelCase prop normalization.
 *
 * HTML lowercases attribute names, so `iconColor` becomes `iconcolor`.
 * The smartCamelCase function restores camelCase using known word boundaries.
 *
 * Regression test for: https://linear.app/readme-io/issue/CX-2731/mdx-ish-custom-components-have-issues-working-loading
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