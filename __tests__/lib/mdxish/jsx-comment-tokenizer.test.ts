import { mdxish } from '../../../lib/mdxish';
import { extractText } from '../../../processor/transform/extract-text';
import { findAllElementsByTagName, findElementByTagName, parseMdxish } from '../../helpers';

const parseMdast = (md: string) => parseMdxish(md, { newEditorTypes: true });
const parseMdastDefault = (md: string) => parseMdxish(md);

describe('JSX comment tokenizer (newEditorTypes)', () => {
  it('should parse a single-line JSX comment as one mdxFlowExpression', () => {
    const mdast = parseMdast('{/* hello */}');
    expect(mdast.children).toHaveLength(1);
    expect(mdast.children[0].type).toBe('mdxFlowExpression');
    expect((mdast.children[0] as { value: string }).value).toBe('/* hello */');
  });

  it('should parse a multiline JSX comment as one mdxFlowExpression', () => {
    const mdast = parseMdast('{/* line one\nline two */}');
    expect(mdast.children).toHaveLength(1);
    expect(mdast.children[0].type).toBe('mdxFlowExpression');
  });

  it('should parse a JSX comment with blank lines as one node', () => {
    const mdast = parseMdast('{/* test\n\n*/}');
    expect(mdast.children).toHaveLength(1);
    expect(mdast.children[0].type).toBe('mdxFlowExpression');
    expect((mdast.children[0] as { value: string }).value).toBe('/* test\n\n*/');
  });

  it('should parse a JSX comment wrapping a magic block as one node', () => {
    const md = `{/* commented out
[block:image]
{
  "images": [{"image": ["https://example.com/img.png", null, "Alt"]}]
}
[/block]
*/}`;
    const mdast = parseMdast(md);
    expect(mdast.children).toHaveLength(1);
    expect(mdast.children[0].type).toBe('mdxFlowExpression');
    expect((mdast.children[0] as { value: string }).value).toContain('block:image');
  });

  it('should parse a JSX comment wrapping a magic block with blank lines as one node', () => {
    const md = `{/* commented out

[block:image]
{
  "images": [{"image": ["https://example.com/img.png", null, "Alt"]}]
}
[/block]

*/}`;
    const mdast = parseMdast(md);
    expect(mdast.children).toHaveLength(1);
    expect(mdast.children[0].type).toBe('mdxFlowExpression');
  });

  it('should parse an indented JSX comment wrapping a magic block as one node', () => {
    const md = `   {/*
[block:image]
{
  "images": [{"image": ["https://example.com/img.png", null, "Alt"]}]
}
[/block]
*/}

Hi there!`;
    const mdast = parseMdast(md);
    expect(mdast.children[0].type).toBe('mdxFlowExpression');
    expect((mdast.children[0] as { value: string }).value).toContain('block:image');
    expect(mdast.children[1].type).toBe('paragraph');
  });

  it('should not consume non-comment expressions starting with {', () => {
    const md = '{1 + 1}';
    const mdast = parseMdast(md);
    expect(mdast.children[0].type).not.toBe('jsxComment');
  });

  it('should leave magic blocks outside comments as separate nodes', () => {
    const md = `{/* hidden */}

[block:image]
{
  "images": [{"image": ["https://example.com/visible.png", null, "Visible"]}]
}
[/block]`;
    const mdast = parseMdast(md);
    expect(mdast.children).toHaveLength(2);
    expect(mdast.children[0].type).toBe('mdxFlowExpression');
    expect(mdast.children[1].type).toBe('image-block');
  });
});

describe('JSX comments in mdxish rendering', () => {
  it('should suppress a magic block image inside a JSX comment', () => {
    const md = `{/*
[block:image]
{
  "images": [{"image": ["https://example.com/img.png", null, "Alt"]}]
}
[/block]
*/}`;
    const ast = mdxish(md);
    expect(findElementByTagName(ast, 'img')).toBeNull();
  });

  it('should not render commented-out content', () => {
    const md = `Before

{/*
[block:image]
{
  "images": [{"image": ["https://example.com/img.png", null, "Alt"]}]
}
[/block]
*/}

After`;
    const ast = mdxish(md);
    const text = extractText(ast);
    expect(text).toContain('Before');
    expect(text).toContain('After');
    expect(text).not.toContain('example.com');
  });

  it('should suppress a callout inside a JSX comment', () => {
    const md = `{/*
[block:callout]
{
  "type": "info",
  "body": "This should be hidden"
}
[/block]
*/}`;
    const ast = mdxish(md);
    expect(extractText(ast)).not.toContain('This should be hidden');
  });

  it('should suppress multiple magic blocks inside one comment', () => {
    const md = `{/*
[block:image]
{
  "images": [{"image": ["https://example.com/first.png", null, "First"]}]
}
[/block]

[block:image]
{
  "images": [{"image": ["https://example.com/second.png", null, "Second"]}]
}
[/block]
*/}`;
    const ast = mdxish(md);
    expect(findAllElementsByTagName(ast, 'img')).toHaveLength(0);
  });

  it('should render magic blocks outside the comment normally', () => {
    const md = `{/*
[block:image]
{
  "images": [{"image": ["https://example.com/hidden.png", null, "Hidden"]}]
}
[/block]
*/}

[block:image]
{
  "images": [{"image": ["https://example.com/visible.png", null, "Visible"]}]
}
[/block]`;
    const ast = mdxish(md);
    const images = findAllElementsByTagName(ast, 'img');
    expect(images).toHaveLength(1);
    expect(images[0].properties?.src).toBe('https://example.com/visible.png');
  });

  it('should produce identical rendering with and without newEditorTypes', () => {
    const md = `Before

{/*
[block:image]
{
  "images": [{"image": ["https://example.com/hidden.png", null, "Hidden"]}]
}
[/block]
*/}

After`;
    const withEditor = mdxish(md, { newEditorTypes: true });
    const withoutEditor = mdxish(md);
    expect(JSON.stringify(withoutEditor)).toBe(JSON.stringify(withEditor));
  });

  it('should produce identical rendering for inline JSX comments with and without newEditorTypes', () => {
    const md = 'Hello {/* inline comment */} world';
    const withEditor = mdxish(md, { newEditorTypes: true });
    const withoutEditor = mdxish(md);
    expect(JSON.stringify(withoutEditor)).toBe(JSON.stringify(withEditor));
  });

  it('should handle two adjacent commented-out blocks', () => {
    const md = `{/*
[block:image]
{
  "images": [{"image": ["https://example.com/a.png", null, "A"]}]
}
[/block]
*/}

{/*
[block:callout]
{
  "type": "warning",
  "body": "Also hidden"
}
[/block]
*/}`;
    const ast = mdxish(md);
    expect(findElementByTagName(ast, 'img')).toBeNull();
    expect(extractText(ast)).not.toContain('Also hidden');
  });
});

describe('JSX comment tokenizer (default, no newEditorTypes)', () => {
  it('should parse a single-line JSX comment as one mdxFlowExpression', () => {
    const mdast = parseMdastDefault('{/* hello */}');
    expect(mdast.children).toHaveLength(1);
    expect(mdast.children[0].type).toBe('mdxFlowExpression');
    expect((mdast.children[0] as { value: string }).value).toBe('/* hello */');
  });

  it('should parse a multiline JSX comment wrapping a magic block as one node', () => {
    const md = `{/* commented out
[block:image]
{
  "images": [{"image": ["https://example.com/img.png", null, "Alt"]}]
}
[/block]
*/}`;
    const mdast = parseMdastDefault(md);
    expect(mdast.children).toHaveLength(1);
    expect(mdast.children[0].type).toBe('mdxFlowExpression');
    expect((mdast.children[0] as { value: string }).value).toContain('block:image');
  });

  it('should parse a JSX comment with blank lines as one node', () => {
    const mdast = parseMdastDefault('{/* test\n\n*/}');
    expect(mdast.children).toHaveLength(1);
    expect(mdast.children[0].type).toBe('mdxFlowExpression');
  });
});
