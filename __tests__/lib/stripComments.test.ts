import { stripComments } from '../../lib';

describe('removeComments', () => {
  it('removes HTML comments', async () => {
    const input = `Hello

<!-- comment -->

Beep boop bop <!--inline comment-->
Bop

[block:html]
{
  "html": "<h1>Magic blocks should not have comments removed.</h1>\n<!--custom html comment-->"
}
[/block]

<ResuableContent />

\`\`\`html
<div>
	Code blocks should not have comments removed.
  <!--code block comment-->
</div>
\`\`\`

[block:image]{ "images": [{ "image": ["https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png", "", "" ], "align": "center" } ]}[/block]

\`<!-- code block comment -->\`

<br />

<!--
  <p>
    Multiline comment
  </p>
-->

Beep boop bop

![](https://owlbertsio-resized.s3.amazonaws.com/This-Is-Fine.jpg.full.png)

Beep boop bop

| A  | B              | C  |
| :- | :------------- | :- |
| 1  | <!--comment--> | 3  |`;

    const output = await stripComments(input);
    expect(output).toMatchSnapshot();
  });

  it('removes MDX comments', async () => {
    const input = `
# Title

{foo /* || bar */}

Some text.

{/* This is an MDX comment. */}

More text.{/* This is an MDX comment. */}

\`{/* Comment in code element should NOT be removed */}\`

{/**
 * Another MDX comment.
 */}

Last text
    `;

    const output = await stripComments(input, { mdx: true });
    expect(output).toMatchSnapshot();
  });

  it('removes both HTML and JSX comments with mdxish option', async () => {
    const input = `
# Title

<!-- HTML comment -->

Some text.

{/* JSX comment */}

More text.<!-- inline HTML comment -->{/* inline JSX comment */}

\`{/* Comment in code element should NOT be removed */}\`
\`<!-- Code block HTML comment should NOT be removed -->\`

{/**
 * Multiline JSX comment.
 */}

<!--
  Multiline HTML comment.
-->

Last text
    `;

    const output = await stripComments(input, { mdxish: true });
    expect(output).toMatchSnapshot();
  });

  it('preserves non-mdx variables', async () => {
    const input = `Hello
<!-- should be removed -->
<<user>>
<<hot_dog>>
<<HOT_DIGGITY_DOG>>
<<glossary:item_term>>`;

    const output = await stripComments(input);
    expect(output).toBe(`Hello

<<user>>
<<hot_dog>>
<<HOT_DIGGITY_DOG>>
<<glossary:item_term>>`);
  });

  it('preserves magic block indentation', async () => {
    const input = `
- foo
- foo
[block:html]
{
  "html": "<h1>Hoo ha</h1>"
}
[/block]`;

    const output = await stripComments(input);
    expect(output).toMatchSnapshot();
  });

  describe('code block sibling handling', () => {
    it('keeps tight sibling code blocks intact without inserting extra newlines', async () => {
      const input = `
\`\`\`
First code block
\`\`\`
\`\`\`
Second code block
\`\`\`
  `;
      const output = await stripComments(input);
      expect(output).toBe(input.trim());
    });

    it('retains newlines around code blocks that are not tight siblings', async () => {
      const input = `
\`\`\`
Thing
\`\`\`

\`\`\`
Thing
\`\`\`

\`\`\`
Thing
\`\`\`
  `;
      const output = await stripComments(input);
      expect(output).toBe(input.trim());
    });
  });

  it('supports a magic block as the first line of the document', async () => {
    const input = `[block:html]
{
  "html": "<div>\nHello\n</div>"
}
[/block]


How are you?`;

    const output = await stripComments(input);
    expect(output).toMatchSnapshot();
  });

  it('preserves hypen dividers with no newline after magic blocks', async () => {
    const input = `First line
[block:html]
{
  "html": "<div>i should not get removed</div>"
}
[/block]
---
### next heading
Last line`;

    const output = await stripComments(input);
    expect(output).toBe(`First line

[block:html]
{
  "html": "<div>i should not get removed</div>"
}
[/block]

***

### next heading

Last line`);
  });

  it('preserves magic blocks inside markdown lists', async () => {
    const input = `- Item one with a magic block:
  [block:callout]
  {
    "type": "info",
    "body": "This callout is inside a list item"
  }
  [/block]
- Item two
- Item three with inline magic block [block:image]{ "images": [{ "image": ["test.png"] }]}[/block]`;

    const output = await stripComments(input);
    expect(output).toMatchSnapshot();
  });

  it('allows leading/trailing spaces between bold/italic markers', async () => {
    const input = `
single line with **bold ** text and \\*literal\\* asterisks.

**bold**
**  leading**
**trailing  **

__emphasis__
__  leading__
__trailing  __

\\*literal\\*
end
`;

    await expect(stripComments(input)).resolves.toMatchInlineSnapshot(`
"single line with **bold** text and \\*literal\\* asterisks.

**bold**
**leading**
**trailing**

**emphasis**
**leading**
**trailing**

\\*literal\\*
end"`);
  });

  it.each([
    {
      type: 'html',
      json: '{ "html": "<div>Hello</div>" }',
    },
    {
      type: 'code',
      json: '{ "codes": [{ "code": "console.log(1)", "language": "js" }] }',
    },
    {
      type: 'api-header',
      json: '{ "title": "My Endpoint", "level": 2 }',
    },
    {
      type: 'image',
      json: '{ "images": [{ "image": ["https://example.com/img.png", "", ""] }] }',
    },
    {
      type: 'callout',
      json: '{ "type": "info", "title": "Note", "body": "Hello" }',
    },
    {
      type: 'parameters',
      json: '{ "cols": 2, "rows": 1, "data": { "h-0": "Name", "h-1": "Type", "0-0": "id", "0-1": "string" } }',
    },
    {
      type: 'table',
      json: '{ "cols": 1, "rows": 1, "data": { "h-0": "Key", "0-0": "val" } }',
    },
    {
      type: 'embed',
      json: '{ "url": "https://example.com", "title": "Example" }',
    },
    {
      type: 'recipe',
      json: '{ "slug": "my-recipe", "title": "My Recipe" }',
    },
    {
      type: 'tutorial-tile',
      json: '{ "slug": "my-tutorial", "title": "My Tutorial" }',
    },
  ])('preserves [block:$type] magic blocks with mdxish flag', async ({ type, json }) => {
    const input = `[block:${type}]\n${json}\n[/block]`;
    const output = await stripComments(input, { mdxish: true });
    expect(output).toBe(input);
  });

  it('preserves non-comment MDX expressions in mdxish mode', async () => {
    const input = 'Foo {user.email} bar {user.name} baz.';

    const output = await stripComments(input, { mdxish: true });
    expect(output).toBe(input);
  });

  // TODO: enable this test after fixing the heading parsing issue
  // https://linear.app/readme-io/issue/CX-2603/sanitize-comment-flag-causing-certain-emphasized-text-and-headings-to
  // eslint-disable-next-line vitest/no-disabled-tests
  it.skip('allows compact headings with no whitespace delimiter', async () => {
    const input = `
#Blue
\\# Literal
# Black`;

    await expect(stripComments(input)).resolves.toMatchInlineSnapshot(`
      "# Blue

      \\# Literal

      # Black"
    `);
  });

  describe('strip comments edge cases', () => {
    it.each([
      ['should return empty for empty string', '', undefined, ''],
      ['should return empty for whitespace-only', '   \n\n  \n   ', undefined, ''],
      ['should strip HTML comment-only doc', '<!-- only a comment -->', undefined, ''],
      ['should strip MDX comment-only doc', '{/* only a comment */}', { mdx: true }, ''],
      ['should strip JSX comment-only doc (mdxish)', '{/* only a comment */}', { mdxish: true }, ''],
      ['should preserve plain text unchanged', 'Just some plain text.', undefined, 'Just some plain text.'],
      ['should strip consecutive HTML comments', 'A\n\n<!-- 1 -->\n<!-- 2 -->\n\nB', undefined, 'A\n\nB'],
      ['should strip consecutive JSX comments (mdxish)', 'A\n\n{/* 1 */}\n{/* 2 */}\n\nB', { mdxish: true }, 'A\n\nB'],
      ['should strip interleaved HTML+JSX (mdxish)', 'A\n<!-- h -->\n{/* j */}\nB', { mdxish: true }, 'A\n\nB'],
      ['should strip back-to-back inline comments', 'Hi <!--a--><!--b--><!--c--> world', undefined, 'Hi  world'],
    ])('%s', async (_name, input, opts, expected) => {
      const output = await stripComments(input, opts);
      expect(output).toBe(expected);
    });

    it.each([
      // position
      ['at doc start/end', '<!-- top -->\nA\n\n<!-- bottom -->', undefined, 'A'],
      ['mid-paragraph', 'A\n<!-- c -->\nB', undefined, 'A\n\nB'],
      // block structures
      ['blockquote', '> Text\n> <!-- c -->\n> More', undefined, '> Text\n>\n> More'],
      ['nested blockquote', '> Outer\n> > Inner <!-- c -->\n> > More', undefined, '> Outer\n>\n> > Inner&#x20;\n> > More'],
      ['ordered list trailing space', '1. A <!-- c -->\n2. B', undefined, '1. A&#x20;\n2. B'],
      ['unordered list trailing space', '- A <!-- c -->\n- B', undefined, '* A&#x20;\n* B'],
      ['between list items', '- Item 1\n<!-- c -->\n- Item 2', undefined, '* Item 1\n\n- Item 2'],
      ['table cells', '| H1 | H2 |\n| :- | :- |\n| <!-- c --> | data |', undefined, '| H1 | H2 |\n| :- | :- |\n|  | data |'],
      // inline formatting
      ['adjacent to bold/italic', '**b**<!-- c -->*i*<!-- c --> x', undefined, '**b***i* x'],
      ['adjacent to link/image', '[a](u)<!-- c -->![b](v)', undefined, '[a](u)![b](v)'],
      // comment content edge cases
      ['dashes inside', 'X <!-- a -- b --> Y', undefined, 'X  Y'],
      ['HTML in comment', 'X\n<!-- <div>hidden</div> -->\nY', undefined, 'X\n\nY'],
      // mdxish
      ['JSX adjacent (mdxish)', 'A{/* c */}B', { mdxish: true }, 'AB'],
      ['JSX trailing (mdxish)', 'X{/* c */}', { mdxish: true }, 'X'],
      ['JSX multiline special chars (mdxish)', 'A\n\n{/*\n  < > & { } [ ] \\\\\n*/}\n\nB', { mdxish: true }, 'A\n\nB'],
      // mdx
      ['MDX nested braces', 'A\n\n{/* {x} */}\n\nB', { mdx: true }, 'A\n\nB'],
      ['MDX multiple inline', 'A {/* a */}{/* b */} B', { mdx: true }, 'A  B'],
      ['MDX JSDoc block', 'A\n\n{/**\n * @param {string} x\n */}\n\nB', { mdx: true }, 'A\n\nB'],
    ])('should strip in %s', async (_name, input, opts, expected) => {
      const output = await stripComments(input, opts);
      expect(output).toBe(expected);
    });

    it.each([
      // code blocks
      ['fenced code block', '```html\n<!-- stay -->\n```', undefined],
      ['fenced code (mdxish)', '```jsx\n{/* stay */}\n```', { mdxish: true }],
      ['inline code', 'Use `<!-- c -->` syntax', undefined],
      ['inline code (mdxish)', 'Use `{/* c */}` syntax', { mdxish: true }],
      // non-comment expressions
      ['dot notation (mdxish)', '{user.email}', { mdxish: true }],
      ['bracket access (mdxish)', '{data.items[0].name}', { mdxish: true }],
      ['ternary (mdx)', '{isAdmin ? "yes" : "no"}', { mdx: true }],
      ['method call (mdx)', '{items.map(i => i.name)}', { mdx: true }],
      ['empty expression (mdxish)', '{  }', { mdxish: true }],
      ['non-comment expression (mdx)', 'Hello {name} world', { mdx: true }],
      // magic blocks
      ['magic block with comment in JSON', '[block:html]\n{\n  "html": "<!-- preserved -->"\n}\n[/block]', undefined],
    ])('should preserve %s', async (_name, input, opts) => {
      const output = await stripComments(input, opts);
      expect(output).toBe(input);
    });

    it.each([
      ['preserving JSX without options', 'Text {/* not removed */} end', undefined, 'not removed'],
      ['stripping HTML but preserving JSX without options', '<!-- gone -->\n{/* kept */}\nText', undefined, 'kept'],
    ])('should default to %s', async (_name, input, opts, shouldContain) => {
      const output = await stripComments(input, opts);
      expect(output).toContain(shouldContain);
    });

    it.each([
      ['self-closing + HTML comment', '<Foo />\n<!-- c -->\nEnd', undefined, '<Foo />\n\nEnd'],
      ['self-closing (mdxish)', '<Foo />\n<!-- c -->\nEnd', { mdxish: true }, '<Foo />\n\nEnd'],
      ['with children (mdx)', '<Callout>\n{/* c */}\nHi\n</Callout>', { mdx: true }, '<Callout>\n  Hi\n</Callout>'],
      ['with props (mdx)', '<Img src="x" />\n{/* c */}\nEnd', { mdx: true }, '<Img src="x" />\n\nEnd'],
    ])('should strip comments around custom components: %s', async (_name, input, opts, expected) => {
      const output = await stripComments(input, opts);
      expect(output).toBe(expected);
    });

    it.each([
      ['comment + magic block child', '- Item <!-- c -->\n  [block:html]\n  {\n    "html": "<p>hi</p>"\n  }\n  [/block]'],
      ['comment between magic blocks', '[block:html]\n{\n  "html": "<a>A</a>"\n}\n[/block]\n<!-- c -->\n[block:code]\n{\n  "codes": [{"code": "1", "language": "js"}]\n}\n[/block]'],
      ['comment between raw HTML', '<div>A</div>\n<!-- c -->\n<div>B</div>'],
    ])('should strip comments but preserve adjacent blocks: %s', async (_name, input) => {
      const output = await stripComments(input);
      expect(output).not.toContain('<!--');
    });

    it('should strip all comments in a full mdxish page', async () => {
      const input = '{/* JSX */}\n<!-- HTML -->\n# Title\n{user.name}\n<!-- c -->\n<Foo />\n- Step\n  [block:callout]\n  {\n    "type": "info",\n    "body": "x"\n  }\n  [/block]\n<<glossary:auth>>';
      const output = await stripComments(input, { mdxish: true });
      expect(output).toContain('{user.name}');
      expect(output).toContain('<Foo />');
      expect(output).toContain('[block:callout]');
      expect(output).toContain('<<glossary:auth>>');
      expect(output).not.toContain('{/* JSX */}');
      expect(output).not.toContain('<!-- HTML -->');
      expect(output).not.toContain('<!-- c -->');
    });

    it('should strip comments inside mdx nested components', async () => {
      const input = '<Steps>\n  {/* c */}\n  <Step>First</Step>\n  {/* c */}\n  <Step>Second</Step>\n</Steps>\n\n{/** deprecated */}\n\n<Tabs>\n  <Tab title="JS">\n    ```js\n    // {/* stays */}\n    ```\n  </Tab>\n</Tabs>';
      const output = await stripComments(input, { mdx: true });
      expect(output).toContain('<Steps>');
      expect(output).toContain('{/* stays */}');
      expect(output).not.toContain('{/* c */}');
      expect(output).not.toContain('deprecated');
    });
  });
});
