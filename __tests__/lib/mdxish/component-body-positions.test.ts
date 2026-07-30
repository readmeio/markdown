import type { Node, Parent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

import { mdxishAstProcessor } from '../../../lib/mdxish';

const parse = (md: string) => {
  const { processor, parserReadyContent } = mdxishAstProcessor(md);
  // Pass the content as the file too (like `processSync` does) — the component
  // transformer reads `file.value` to anchor re-parsed body positions.
  const mdast = processor.runSync(processor.parse(parserReadyContent), parserReadyContent) as Parent;
  return { mdast, source: parserReadyContent };
};

const findAll = (tree: Node, predicate: (node: Node) => boolean): Node[] => {
  const found: Node[] = [];
  const walk = (node: Node) => {
    if (predicate(node)) found.push(node);
    (node as Parent).children?.forEach(walk);
  };
  walk(tree);
  return found;
};

const sliceByPosition = (source: string, node: Node): string =>
  source.slice(node.position?.start?.offset ?? 0, node.position?.end?.offset ?? 0);

/**
 * Wrapper component bodies are re-parsed after being deindented and trimmed, so
 * the resulting child nodes' positions started out relative to that inner string.
 * mdast positions must refer to the parsed source document: consumers (e.g. the
 * MdxishEditor's `nodeToSource`) slice the full source with these offsets, and
 * inner-relative offsets make them extract unrelated content (CX-3772).
 */
describe('component body positions', () => {
  it('remaps a nested component inside <Tabs> to document coordinates', () => {
    const md = [
      'An intro paragraph with enough length to make inner and outer offsets diverge noticeably.',
      '',
      '<Tabs>',
      '  <Tab title="A">',
      '    Some content first.',
      '',
      '    <FooCallout type="info">',
      '      <p>The callout body text.</p>',
      '    </FooCallout>',
      '  </Tab>',
      '',
      '  <Tab title="B">',
      '    Second tab',
      '  </Tab>',
      '</Tabs>',
      '',
    ].join('\n');

    const { mdast, source } = parse(md);
    const [callout] = findAll(
      mdast,
      node => node.type === 'mdxJsxFlowElement' && (node as MdxJsxFlowElement).name === 'FooCallout',
    );

    expect(callout).toBeDefined();
    const slice = sliceByPosition(source, callout);
    expect(slice.startsWith('<FooCallout')).toBe(true);
    expect(slice.trimEnd().endsWith('</FooCallout>')).toBe(true);
  });

  it('remaps nested markdown blocks inside <Tabs> to document coordinates', () => {
    const md = [
      'A long enough intro paragraph so inner-relative offsets land inside of it.',
      '',
      '<Tabs>',
      '  <Tab title="A">',
      '    A paragraph inside the first tab.',
      '  </Tab>',
      '</Tabs>',
      '',
    ].join('\n');

    const { mdast, source } = parse(md);
    const tabParagraphs = findAll(
      mdast,
      node => node.type === 'paragraph' && JSON.stringify(node).includes('A paragraph inside the first tab.'),
    );

    expect(tabParagraphs.length).toBeGreaterThan(0);
    expect(sliceByPosition(source, tabParagraphs[0])).toBe('A paragraph inside the first tab.');
  });

  it('remaps a component nested two wrappers deep', () => {
    const md = [
      'Intro text that inner-relative offsets from the nested body would land inside of.',
      '',
      '<Outer>',
      '  <Inner>',
      '    <FooCallout type="info">',
      '      <p>Deeply nested body.</p>',
      '    </FooCallout>',
      '  </Inner>',
      '</Outer>',
      '',
    ].join('\n');

    const { mdast, source } = parse(md);
    const [callout] = findAll(
      mdast,
      node => node.type === 'mdxJsxFlowElement' && (node as MdxJsxFlowElement).name === 'FooCallout',
    );

    expect(callout).toBeDefined();
    const slice = sliceByPosition(source, callout);
    expect(slice.startsWith('<FooCallout')).toBe(true);
    expect(slice.trimEnd().endsWith('</FooCallout>')).toBe(true);
  });
});
