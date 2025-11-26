import type { CustomComponents } from '../../../types';

import { describe, it, expect } from 'vitest';

import { mix } from '../../../lib';

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

  it('should handle empty non-existent components', () => {
    const md = `<EmptyComponent />

Hello

<AnotherEmpty />`;

    // Preprocess self-closing tags before processing (matching mix.ts behavior)

    const result = mix(md);
    expect(result).toContain('Hello');
    expect(result).not.toContain('EmptyComponent');
    expect(result).not.toContain('AnotherEmpty');
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
