import type { CustomComponents } from '../../../types';
import type { Root } from 'hast';

import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { VFile } from 'vfile';

import { describe, it, expect } from 'vitest';

import { rehypeMdxishComponents } from '../../../processor/plugin/mdxish-components';
import { processSelfClosingTags } from '../../../processor/transform/preprocess-jsx-expressions';

describe('rehypeMdxishComponents', () => {
  const createProcessor = (components: CustomComponents = {}) => {
    const processMarkdown = (processedContent: string): Root => {
      const processor = unified()
        .use(remarkParse)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeRaw)
        .use(rehypeMdxishComponents, {
          components,
          processMarkdown,
        });

      const vfile = new VFile({ value: processedContent });
      const hast = processor.runSync(processor.parse(processedContent), vfile) as Root;

      if (!hast) {
        throw new Error('Markdown pipeline did not produce a HAST tree.');
      }

      return hast;
    };

    return unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeMdxishComponents, {
        components,
        processMarkdown,
      })
      .use(rehypeStringify);
  };

  it('should remove non-existent custom components from the tree', () => {
    const md = `<MyDemo> from inside </MyDemo>

Hello

<Custom>`;

    const processor = createProcessor({});
    const result = processor.processSync(md);
    const html = String(result);

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

    const processor = createProcessor({ TestComponent });
    const result = processor.processSync(md);
    const html = String(result);

    // Should contain the component (tagName will be transformed to TestComponent)
    expect(html).toContain('TestComponent');
    expect(html).toContain('Hello');
  });

  it('should remove nested non-existent components', () => {
    const md = `<Outer>
  <Inner>nested content</Inner>
  Hello
</Outer>`;

    const processor = createProcessor({});
    const result = processor.processSync(md);
    const html = String(result);

    // Should remove both Outer and Inner, but keep "Hello"
    expect(html).not.toContain('Hello');
    expect(html).not.toContain('Outer');
    expect(html).not.toContain('Inner');
    expect(html).not.toContain('nested content');
  });

  it('should handle mixed existing and non-existent components', () => {
    // componentExists only checks if the key exists, so we can use a minimal mock
    const ExistingComponent = {} as CustomComponents[string];
    const md = `<ExistingComponent>Keep this</ExistingComponent>

<NonExistent>Remove this</NonExistent>

Hello`;

    const processor = createProcessor({ ExistingComponent });
    const result = processor.processSync(md);
    const html = String(result);

    // Should keep existing component and "Hello", but remove non-existent
    expect(html).toContain('ExistingComponent');
    expect(html).toContain('Keep this');
    expect(html).toContain('Hello');
    expect(html).not.toContain('NonExistent');
    expect(html).not.toContain('Remove this');
  });

  it('should preserve regular HTML tags', () => {
    const md = `<div>This is HTML</div>

<NonExistentComponent>Remove this</NonExistentComponent>

Hello`;

    const processor = createProcessor({});
    const result = processor.processSync(md);
    const html = String(result);

    // Should keep HTML div, remove non-existent component, keep Hello
    expect(html).toContain('<div>');
    expect(html).toContain('This is HTML');
    expect(html).toContain('Hello');
    expect(html).not.toContain('NonExistentComponent');
    expect(html).not.toContain('Remove this');
  });

  it('should handle empty non-existent components', () => {
    const md = `<EmptyComponent />

Hello

<AnotherEmpty />`;

    // Preprocess self-closing tags before processing (matching mix.ts behavior)
    const processedMd = processSelfClosingTags(md);

    const processor = createProcessor({});
    const result = processor.processSync(processedMd);
    const html = String(result);

    // Should only contain "Hello"
    expect(html).toContain('Hello');
    expect(html).not.toContain('EmptyComponent');
    expect(html).not.toContain('AnotherEmpty');
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

    // Preprocess self-closing tags before processing (matching mix.ts behavior)
    const processedMd = processSelfClosingTags(md);

    const processor = createProcessor({});
    const result = processor.processSync(processedMd);
    const html = String(result);

    console.log(html);

    expect(html).not.toContain('Hello world!');
    expect(html).toContain('Reusable content should work the same way:');
    expect(html).toContain('hello');
    expect(html).not.toContain('from inside');
  });
});
