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
});
