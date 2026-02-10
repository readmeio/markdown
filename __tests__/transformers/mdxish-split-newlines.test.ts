import type { CustomComponents } from '../../types';
import type { Element, Text } from 'hast';

import { mdxish } from '../../lib';

describe('mdxish split newlines', () => {
  it('converts soft line breaks into <br> elements', () => {
    const md = `Line 1
Line 2`;
    const tree = mdxish(md);

    const paragraph = tree.children[0] as Element;
    expect(paragraph.children).toHaveLength(3);
    expect((paragraph.children[0] as Text).value).toBe('Line 1');
    expect((paragraph.children[1] as Element).tagName).toBe('br');
    expect((paragraph.children[2] as Text).value).toBe('Line 2');
  });

  it('handles multiple soft line breaks and retains lone \\n nodes', () => {
    const md = `A
B

C
D
`;
    const tree = mdxish(md);
    expect(tree.children).toHaveLength(3);

    const firstParagraph = tree.children[0] as Element;
    expect(firstParagraph.children).toHaveLength(3);
    expect((firstParagraph.children[1] as Element).tagName).toBe('br');

    expect((tree.children[1] as Text).value).toBe('\n');

    const secondParagraph = tree.children[2] as Element;
    expect(secondParagraph.children).toHaveLength(3);
    expect((secondParagraph.children[1] as Element).tagName).toBe('br');
  });

  it('inserts <br> in list item paragraphs', () => {
    const md = `- List 1
- List 2
Alone`;
    const tree = mdxish(md);
    const ulElement = tree.children[0] as Element;

    expect(ulElement.children).toHaveLength(5);
    expect((ulElement.children[0] as Text).value).toBe('\n');
    expect((ulElement.children[2] as Text).value).toBe('\n');

    const lastListItem = ulElement.children[3] as Element;
    expect(lastListItem.children).toHaveLength(3);
    expect((lastListItem.children[1] as Element).tagName).toBe('br');
    expect((lastListItem.children[2] as Text).value).toBe('Alone');
  });

  it('does not touch inline code content', () => {
    const code = 'a\\nb';
    const md = `Use \`${code}\` here`;
    const tree = mdxish(md);

    const paragraph = tree.children[0] as Element;
    expect(paragraph.children).toHaveLength(3);

    const codeElement = paragraph.children[1] as Element;
    expect(codeElement.tagName).toBe('code');
    expect(codeElement.children).toHaveLength(1);
    expect((codeElement.children[0] as Text).value).toBe(code);
  });

  it('does not touch code block content', () => {
    const md = `\`\`\`
a
b
\`\`\``;
    const tree = mdxish(md);
    expect(tree.children).toHaveLength(1);

    const codeBlock = tree.children[0] as Element;
    expect(codeBlock.children).toHaveLength(1);
    const codeElement = codeBlock.children[0] as Element;
    expect(codeElement.tagName).toBe('code');
    expect(codeElement.children).toHaveLength(1);

    const codeElementProperties = codeElement.properties;
    expect(codeElementProperties).toMatchInlineSnapshot(`
      {
        "value": "a
      b",
      }
    `);
  });

  it('does not touch content inside custom component', () => {
    const MyComponent = {} as CustomComponents[string];
    const md = `<MyComponent>
Line 1
Line 2
</MyComponent>`;

    const tree = mdxish(md, { components: { MyComponent }});
    expect(tree.children).toHaveLength(1);

    const componentElement = tree.children[0] as Element;
    expect(componentElement.tagName).toBe('MyComponent');
    expect(componentElement.children).toHaveLength(1);

    const paragraph = componentElement.children[0] as Element;
    expect(paragraph.tagName).toBe('p');
    expect(paragraph.children).toHaveLength(3);
    expect((paragraph.children[0] as Text).value).toBe('Line 1');
    expect((paragraph.children[1] as Element).tagName).toBe('br');
    expect((paragraph.children[2] as Text).value).toBe('Line 2');
  });
});
