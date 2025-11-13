import { migrate } from '../helpers';

describe('migrating html comments', () => {
  it('migrates escaped html comments', () => {
    const md = `
<!--



## Walkthrough

[block:html]
{
  "html": "<div style=\\"position: relative; padding-bottom: 56.25%; height: 0;\\"><iframe src=\\"https://www.loom.com/embed/53dd194717bb4965a8e838b95715ff18\\" frameborder=\\"0\\" webkitallowfullscreen mozallowfullscreen allowfullscreen style=\\"position: absolute; top: 0; left: 0; width: 100%; height: 100%;\\"></iframe></div>"
}
[/block]


<br />

\\-->
`;

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "{/*



      ## Walkthrough

      <HTMLBlock>{\`
      <div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/53dd194717bb4965a8e838b95715ff18" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
      \`}</HTMLBlock>

      <br />


      */}
      "
    `);
  });

  it('converts markdown within html comments', () => {
    const md = `
<!--

### Heading inside comment

- a **list** item

-->
`;

    const mdx = migrate(md);
    expect(mdx).toMatchInlineSnapshot(`
      "{/*

      ### Heading inside comment

      * a **list** item


      */}
      "
    `);
  });
});
