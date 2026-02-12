import type { Element, Root, RootContent } from 'hast';

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

  it('should not swallow content after multiple HTML tags', () => {
    const md = `<div></div>
<section></section>
# Still a heading`;

    const ast = mdxish(md);
    const heading = findElementByTagName(ast, 'h1');
    expect(heading).not.toBeNull();
  });
});
