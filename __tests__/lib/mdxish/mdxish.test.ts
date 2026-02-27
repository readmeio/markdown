import type { CustomComponents } from '../../../types';
import type { Element, Root, RootContent, Text } from 'hast';

import { mdxish, mdxishAstProcessor } from '../../../lib/mdxish';
import { extractText } from '../../../processor/transform/extract-text';

type HastNode = Root | RootContent;

/**
 * Recursively finds an element with the specified tagName in a HAST tree.
 */
function findElementByTagName(node: HastNode, tagName: string): Element | null {
  if ('type' in node && node.type === 'element' && 'tagName' in node && node.tagName === tagName) {
    return node;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.reduce<Element | null>((found, child) => {
      if (found) return found;
      return findElementByTagName(child, tagName);
    }, null);
  }
  return null;
}

describe('mdxish should render', () => {
  describe('invalid mdx syntax', () => {
    it('should render unclosed tags', () => {
      const md = '<br>';
      expect(() => mdxish(md)).not.toThrow();
    });

    it('should render unclosed curly braces', () => {
      const md1 = 'Hello {user.name';
      expect(() => mdxish(md1)).not.toThrow();
      const md2 = 'This is an api: /param1/{param2 that has a unclosed curly brace';
      expect(() => mdxish(md2)).not.toThrow();
    });

    it('should render unclosed curly braces in content with emojis', () => {
      // Regression test for bug where emojis prevented brace escaping
      const md = `> 📘 Note
>
> Content with unclosed brace: {`;
      expect(() => mdxish(md)).not.toThrow();

      // Also test the exact bug report case
      const bugReportCase = `test

> 📘 Enter an optional title
>
> test
>
> test {`;
      expect(() => mdxish(bugReportCase)).not.toThrow();
    });
  });

  it('should render content in new lines', () => {
    const md = `<div>hello
</div>`;
    expect(() => mdxish(md)).not.toThrow();
  });

  describe('should handle just ">"', () => {
    it('replaces empty blockquote with paragraph containing ">"', () => {
      const md = '>';

      const tree = mdxish(md);
      // Empty blockquote is replaced with paragraph containing '>'
      const textContent = extractText(tree);
      expect(textContent.trim()).toBe('>');

      // Verify it's NOT a blockquote element in HAST
      const hasBlockquote = tree.children.some(
        child =>
          child &&
          typeof child === 'object' &&
          'type' in child &&
          child.type === 'element' &&
          'tagName' in child &&
          child.tagName === 'blockquote',
      );
      expect(hasBlockquote).toBe(false);
    });
  });

  describe('relaxed md syntax, such as', () => {
    it('wrong bold syntax', () => {
      const md = `**Bold**

Normal

Hello** Wrong Bold**`;
      const tree = mdxish(md);

      const getStrongTexts = (node: Root | Root['children'][number]): string[] => {
        const texts: string[] = [];
        if ('type' in node && node.type === 'element' && node.tagName === 'strong') {
          const textNodes =
            'children' in node && Array.isArray(node.children)
              ? node.children.filter(c => 'type' in c && c.type === 'text')
              : [];
          texts.push(textNodes.map(t => ('value' in t ? t.value : '')).join(''));
        }
        if ('children' in node && Array.isArray(node.children)) {
          node.children.forEach(child => {
            texts.push(...getStrongTexts(child));
          });
        }
        return texts;
      };

      const strongTexts = getStrongTexts(tree);
      expect(strongTexts.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('JSX comment removal', () => {
  it('should remove JSX comments', () => {
    const md = 'Hello {/* this is a comment */} world';
    const tree = mdxish(md);
    const text = extractText(tree);
    expect(text).toContain('Hello');
    expect(text).toContain('world');
    expect(text).not.toContain('this is a comment');
    expect(text).not.toContain('{/*');
  });

  it('should remove multiline JSX comments', () => {
    const md = `Before
{/**
 * Multiline comment
 */}
After`;
    const tree = mdxish(md);
    const text = extractText(tree);
    expect(text).toContain('Before');
    expect(text).toContain('After');
    expect(text).not.toContain('Multiline comment');
  });

  it('should preserve JSX comments in code blocks', () => {
    const md = '```jsx\n{/* comment in code block */}\n```';
    const tree = mdxish(md);
    const text = extractText(tree);
    expect(text).toContain('{/* comment in code block */}');
  });
});

describe('mdxish safeMode', () => {
  describe('with safeMode: false (default)', () => {
    it('should evaluate inline expressions', () => {
      const md = 'Result: {5 * 10}';
      const tree = mdxish(md, { jsxContext: {} });
      const text = extractText(tree);
      expect(text).toContain('50');
    });

    it('should evaluate attribute expressions', () => {
      const md = '<a href={baseUrl}>Link</a>';
      const tree = mdxish(md, { jsxContext: { baseUrl: 'https://example.com' } });
      const anchor = findElementByTagName(tree, 'a');
      expect(anchor?.properties?.href).toBe('https://example.com');
    });

    it('should parse user variables', () => {
      const md = 'Hello {user.name}!';
      const tree = mdxish(md);
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).not.toBeNull();
      expect(variable?.properties?.name).toBe('name');
    });
  });

  describe('with safeMode: true', () => {
    it('should NOT evaluate inline expressions - keep as literal text', () => {
      const md = 'Result: {5 * 10}';
      const tree = mdxish(md, { safeMode: true });
      const text = extractText(tree);
      expect(text).toContain('{5 * 10}');
      expect(text).not.toContain('50');
    });

    it('should NOT evaluate attribute expressions', () => {
      const md = '<a href={baseUrl}>Link</a>';
      const tree = mdxish(md, { safeMode: true, jsxContext: { baseUrl: 'https://example.com' } });
      const anchor = findElementByTagName(tree, 'a');
      expect(anchor?.properties?.href).not.toBe('https://example.com');
    });

    it('should still parse user variables', () => {
      const md = 'Hello {user.name}!';
      const tree = mdxish(md);
      const variable = findElementByTagName(tree, 'variable');
      expect(variable).not.toBeNull();
      expect(variable?.properties?.name).toBe('name');
    });

    it('should still process regular markdown syntax', () => {
      const md = '# Heading\n\n**bold** and _italic_';
      const tree = mdxish(md, { safeMode: true });
      const text = extractText(tree);
      expect(text).toContain('Heading');
      expect(text).toContain('bold');
      expect(text).toContain('italic');
    });

    it('should still process custom components', () => {
      const md = '<Callout>Important message</Callout>';
      expect(() => mdxish(md, { safeMode: true })).not.toThrow();
    });
  });

  describe('mdxishAstProcessor with safeMode', () => {
    it('should not include mdxExpression extensions in safeMode', () => {
      const md = 'Test {expression}';
      const { processor } = mdxishAstProcessor(md, { safeMode: true });
      const mdast = processor.parse(md);
      const hasMdxExpression = JSON.stringify(mdast).includes('mdxTextExpression');
      expect(hasMdxExpression).toBe(false);
    });

    it('should include mdxExpression extensions without safeMode', () => {
      const md = 'Test {expression}';
      const { processor, parserReadyContent } = mdxishAstProcessor(md, { safeMode: false });
      const mdast = processor.parse(parserReadyContent);
      const hasMdxExpression = JSON.stringify(mdast).includes('mdxTextExpression');
      expect(hasMdxExpression).toBe(true);
    });
  });
});

describe('HTML flow block termination', () => {
  it('should not swallow a heading after an HTML block', () => {
    const md = `<div><p></p></div>
# My Heading`;

    const ast = mdxish(md);
    const heading = findElementByTagName(ast, 'h1');
    expect(heading).not.toBeNull();
  });

  it('should not swallow a paragraph after an HTML block', () => {
    const md = `<div></div>
This is a paragraph.`;

    const ast = mdxish(md);
    const paragraph = findElementByTagName(ast, 'p');
    expect(paragraph).not.toBeNull();
    expect(JSON.stringify(paragraph)).toContain('This is a paragraph.');
  });

  it('should not swallow a blockquote after an HTML block', () => {
    const md = `<div></div>
> This is a blockquote`;

    const ast = mdxish(md);
    const blockquote = findElementByTagName(ast, 'blockquote');
    expect(blockquote).not.toBeNull();
  });

  it('should not swallow a list after an HTML block', () => {
    const md = `<div></div>
- Item one
- Item two`;

    const ast = mdxish(md);
    const ul = findElementByTagName(ast, 'ul');
    expect(ul).not.toBeNull();
  });

  it('should not swallow an ordered list after an HTML block', () => {
    const md = `<div></div>
1. First
2. Second`;

    const ast = mdxish(md);
    const ol = findElementByTagName(ast, 'ol');
    expect(ol).not.toBeNull();
  });

  it('should not swallow a code fence after an HTML block', () => {
    const md = `<div></div>
\`\`\`js
console.log('hello');
\`\`\``;

    const ast = mdxish(md);
    const code = findElementByTagName(ast, 'code');
    expect(code).not.toBeNull();
  });

  it('should not swallow a thematic break after an HTML block', () => {
    const md = `<div></div>
---`;

    const ast = mdxish(md);
    const hr = findElementByTagName(ast, 'hr');
    expect(hr).not.toBeNull();
  });

  it('should not swallow a magic block callout after an HTML block', () => {
    const md = `<div><p></p></div>
[block:callout]
{
  "type": "success",
  "body": "This should render."
}
[/block]`;

    const ast = mdxish(md);
    const callout = findElementByTagName(ast, 'Callout');
    expect(callout).not.toBeNull();
    expect(callout!.properties.theme).toBe('okay');
  });

  it('should not swallow a magic block code after an HTML block', () => {
    const md = `<div></div>
[block:code]
{
  "codes": [{"code": "echo hello", "language": "bash"}]
}
[/block]`;

    const ast = mdxish(md);
    const codeTabs = findElementByTagName(ast, 'CodeTabs');
    expect(codeTabs).not.toBeNull();
  });

  it('should not swallow a magic block image after an HTML block', () => {
    const md = `<div></div>
[block:image]
{
  "images": [{"image": ["https://example.com/img.png", null, "Alt"]}]
}
[/block]`;

    const ast = mdxish(md);
    const img = findElementByTagName(ast, 'img');
    expect(img).not.toBeNull();
  });

  it('should not swallow a magic block callout after an HTML block with text content', () => {
    const md = `<div><p>Inner text</p></div>Outer text
[block:callout]
{
  "type": "success",
  "body": "This callout should render."
}
[/block]`;

    const ast = mdxish(md);
    const callout = findElementByTagName(ast, 'Callout');
    expect(callout).not.toBeNull();
    expect(callout!.properties.theme).toBe('okay');

    const lastChild = ast.children[ast.children.length - 1] as Element;
    expect((lastChild as Element).tagName).toBe('Callout');
  });

  it('should not swallow unindented magic block content wrapped in an HTML tag', () => {
    const md = `<div>
[block:callout]
{
  "type": "success",
  "body": "This should render."
}
[/block]
</div>
`;

    const ast = mdxish(md);
    const callout = findElementByTagName(ast, 'Callout');
    expect(callout).not.toBeNull();
  });

  it('should not swallow content after multiple HTML tags', () => {
    const md = `<div></div>
<section></section>
# Still a heading`;

    const ast = mdxish(md);
    const heading = findElementByTagName(ast, 'h1');
    expect(heading).not.toBeNull();
  });

  it('should not transform 4 indented line content after the opening tag as a code block', () => {
    // Regression test for: https://linear.app/readme-io/issue/RM-15306/html-being-treated-as-code-blocks-regression
    const md = `<div>
        hello
</div>
`;

    const ast = mdxish(md);
    const code = findElementByTagName(ast, 'code');
    expect(code).toBeNull();
  });
});

describe('mdxish hard breaks', () => {
  describe('soft breaks to hard breaks', () => {
    it('converts soft line breaks into <br> elements', () => {
      const md = `Line 1
Line 2`;
      const tree = mdxish(md);

      const paragraph = tree.children[0] as Element;
      expect(paragraph.children).toHaveLength(3);
      expect((paragraph.children[0] as Text).value).toBe('Line 1');
      expect((paragraph.children[1] as Element).tagName).toBe('br');
      expect((paragraph.children[2] as Text).value).toBe('\nLine 2');
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
      expect((lastListItem.children[2] as Text).value).toBe('\nAlone');
    });

    it('inserts <br> in blockquote content', () => {
      const md = '> Line 1\n> Line 2';
      const tree = mdxish(md);

      const blockquote = tree.children.find((c): c is Element => c.type === 'element' && c.tagName === 'blockquote')!;
      const paragraph = blockquote.children.find((c): c is Element => c.type === 'element' && c.tagName === 'p')!;

      expect((paragraph.children[0] as Text).value).toBe('Line 1');
      expect((paragraph.children[1] as Element).tagName).toBe('br');
      expect((paragraph.children[2] as Text).value).toBe('\nLine 2');
    });

    it('does not touch content inside custom component', () => {
      const MyComponent = {} as CustomComponents[string];
      const md = `<MyComponent>
Line 1
Line 2
</MyComponent>`;

      const tree = mdxish(md, { components: { MyComponent } });
      expect(tree.children).toHaveLength(1);

      const componentElement = tree.children[0] as Element;
      expect(componentElement.tagName).toBe('MyComponent');
      expect(componentElement.children).toHaveLength(1);

      const paragraph = componentElement.children[0] as Element;
      expect(paragraph.tagName).toBe('p');
      expect(paragraph.children).toHaveLength(3);
      expect((paragraph.children[0] as Text).value).toBe('Line 1');
      expect((paragraph.children[1] as Element).tagName).toBe('br');
      expect((paragraph.children[2] as Text).value).toBe('\nLine 2');
    });
  });

  describe('preserves code content', () => {
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
  });

  describe('edge cases', () => {
    it('renders double newlines as separate paragraphs', () => {
      const md = 'Line 1\n\nLine 2';
      const tree = mdxish(md);

      const paragraphs = tree.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'p');
      expect(paragraphs).toHaveLength(2);
      expect((paragraphs[0].children[0] as Text).value).toBe('Line 1');
      expect((paragraphs[1].children[0] as Text).value).toBe('Line 2');
    });

    it('does not render a trailing newline as a break', () => {
      const md = 'Line 1\n';
      const tree = mdxish(md);

      const paragraphs = tree.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'p');
      expect(paragraphs).toHaveLength(1);
      expect((paragraphs[0].children[0] as Text).value).toBe('Line 1');
      const hasBr = paragraphs[0].children.some(c => c.type === 'element' && c.tagName === 'br');
      expect(hasBr).toBe(false);
    });

    it('does not render a leading newline as a break', () => {
      const md = '\nLine 1';
      const tree = mdxish(md);

      const paragraphs = tree.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'p');
      expect(paragraphs).toHaveLength(1);
      expect((paragraphs[0].children[0] as Text).value).toBe('Line 1');
      const hasBr = paragraphs[0].children.some(c => c.type === 'element' && c.tagName === 'br');
      expect(hasBr).toBe(false);
    });

    it('handles three or more consecutive newlines as paragraph breaks', () => {
      const md = 'Line 1\n\n\nLine 2';
      const tree = mdxish(md);

      const paragraphs = tree.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'p');
      expect(paragraphs).toHaveLength(2);
      expect((paragraphs[0].children[0] as Text).value).toBe('Line 1');
      expect((paragraphs[1].children[0] as Text).value).toBe('Line 2');
    });
  });
});
