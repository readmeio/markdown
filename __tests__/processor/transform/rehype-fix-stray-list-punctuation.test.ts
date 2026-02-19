import type { Element, Root } from 'hast';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeFixStrayListPunctuation from '../../../processor/transform/mdxish/rehype-fix-stray-list-punctuation';
import rehypeStringify from 'rehype-stringify';

describe('rehypeFixStrayListPunctuation', () => {
  const processHtml = (html: string, usePlugin: boolean = true) => {
    const processor = unified().use(rehypeParse, { fragment: true });
    
    if (usePlugin) {
      processor.use(rehypeFixStrayListPunctuation);
    }
    
    processor.use(rehypeStringify);
    
    return processor.processSync(html).toString();
  };

  it('moves stray punctuation into the preceding list item', () => {
    const input = `<p>Some text</p><ul><li>Item 1</li><li>Item 2</li></ul><p>.</p>`;
    const expected = `<p>Some text</p><ul><li>Item 1</li><li>Item 2.</li></ul>`;
    
    const output = processHtml(input);
    expect(output).toBe(expected);
  });

  it('handles spaces between list and paragraph', () => {
    const input = `<ul><li>Item 1</li></ul>  \n  <p>.</p>`;
    const expected = `<ul><li>Item 1.</li></ul>  \n  `;
    
    const output = processHtml(input);
    expect(output).toBe(expected);
  });

  it('moves multiple punctuation characters', () => {
    const input = `<ul><li>Item 1</li></ul><p>?!.</p>`;
    const expected = `<ul><li>Item 1?!.</li></ul>`;
    
    const output = processHtml(input);
    expect(output).toBe(expected);
  });

  it('works with ordered lists', () => {
    const input = `<ol><li>Item 1</li></ol><p>.</p>`;
    const expected = `<ol><li>Item 1.</li></ol>`;
    
    const output = processHtml(input);
    expect(output).toBe(expected);
  });

  it('does not touch paragraphs with normal text', () => {
    const input = `<ul><li>Item 1</li></ul><p>This is a normal paragraph.</p>`;
    const output = processHtml(input);
    expect(output).toBe(input);
  });

  it('does not touch punctuation if not following a list', () => {
    const input = `<p>Some text</p><p>.</p>`;
    const output = processHtml(input);
    expect(output).toBe(input);
  });

  it('handles empty lists gracefully', () => {
    const input = `<ul></ul><p>.</p>`;
    const output = processHtml(input);
    expect(output).toBe(input);
  });
});
