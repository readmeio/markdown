import type { Element } from 'hast';

import { mdast, hast } from '../../index';
import { mdxish } from '../../lib/mdxish';
import { findAllElementsByTagName, findElementByTagName } from '../helpers';

describe('Code Tabs Transformer', () => {
  it('can parse code tabs', () => {
    const md = `
\`\`\`
First code block
\`\`\`
\`\`\`
Second code block
\`\`\`
`;
    const tree = mdast(md);

    expect(tree.children[0].type).toBe('code-tabs');
  });

  it('sets the correct data attributes', () => {
    const md = `
\`\`\`
First code block
\`\`\`
\`\`\`
Second code block
\`\`\`
`;
    const tree = mdast(md);

    expect(tree.children[0].data).toMatchInlineSnapshot(`
      {
        "hName": "CodeTabs",
      }
    `);
  });

  it('can parse lang and meta', () => {
    const md = `
\`\`\`javascript First Title
First code block
\`\`\`
\`\`\`text
Second code block
\`\`\`
`;
    const ast = mdast(md);

    expect(ast.children[0].children[0]).toStrictEqual(
      expect.objectContaining({ lang: 'javascript', meta: 'First Title' }),
    );
    expect(ast.children[0].children[1]).toStrictEqual(expect.objectContaining({ lang: 'text', meta: null }));
  });

  it('wraps single code blocks with tabs if they have a lang set', () => {
    const md = `
\`\`\`javascript
const languageSet = true;
\`\`\`
`;

    const tree = mdast(md);
    expect(tree.children[0].type).toBe('code-tabs');
  });

  it('wraps single code blocks with tabs if they have a title set', () => {
    const md = `
\`\`\`javascript Testing
const languageSet = true;
\`\`\`
`;

    const tree = mdast(md);
    expect(tree.children[0].type).toBe('code-tabs');
  });

  it('allows code tabs within html blocks', () => {
    const md = `
<p>

\`\`\`
First code block
\`\`\`
\`\`\`
Second code block
\`\`\`

</p>
`;
    const tree = hast(md);

    expect(tree.children[0].children[0].tagName).toBe('CodeTabs');
  });

  it('allows code tabs within container blocks', () => {
    const md = `
- ~~~Name
  {{company_name}}
  ~~~
  ~~~Email
  {{company_email}}
  ~~~
  ~~~URL
  {{company_url}}
  ~~~
`;

    const tree = mdast(md);

    expect(tree.children[0].children[0].children[0].type).toBe('code-tabs');
    expect(tree.children[0].children[0].children).toHaveLength(1);
  });

  describe('in mdxish', () => {
    describe('inside MDX/JSX components', () => {
      it('wraps a fenced code block inside <Tabs><Tab> in <CodeTabs>', () => {
        const tree = mdxish('<Tabs>\n<Tab title="x">\n\n```js\nconst x = 1;\n```\n\n</Tab>\n</Tabs>');

        const codeTabs = findElementByTagName(tree, 'CodeTabs');
        expect(codeTabs).toMatchObject({
          type: 'element',
          tagName: 'CodeTabs',
          children: [
            {
              type: 'element',
              tagName: 'pre',
              children: [
                {
                  type: 'element',
                  tagName: 'code',
                  properties: {
                    className: ['language-js'],
                    lang: 'js',
                    value: 'const x = 1;',
                  },
                },
              ],
            },
          ],
        });
      });

      it('wraps a fenced code block inside <Callout> in <CodeTabs>', () => {
        const tree = mdxish('<Callout icon="📘">\n\n```python\nprint("hi")\n```\n\n</Callout>');

        const codeTabs = findElementByTagName(tree, 'CodeTabs');
        expect(codeTabs).not.toBeNull();
        const code = findElementByTagName(codeTabs as Element, 'code');
        expect(code).toMatchObject({
          type: 'element',
          tagName: 'code',
          properties: {
            className: ['language-python'],
            lang: 'python',
            value: 'print("hi")',
          },
        });
      });

      it('merges adjacent code blocks of different languages into a single <CodeTabs> inside <Tabs>', () => {
        const tree = mdxish(
          '<Tabs>\n<Tab title="x">\n\n```js\nconst x = 1;\n```\n```py\nx = 1\n```\n\n</Tab>\n</Tabs>',
        );

        const allCodeTabs = findAllElementsByTagName(tree, 'CodeTabs');
        expect(allCodeTabs).toHaveLength(1);

        const pres = findAllElementsByTagName(allCodeTabs[0], 'pre');
        expect(pres).toHaveLength(2);
        expect((pres[0].children[0] as Element).properties).toMatchObject({ lang: 'js' });
        expect((pres[1].children[0] as Element).properties).toMatchObject({ lang: 'py' });
      });

      it('does NOT wrap a single code block with no language inside <Tabs>', () => {
        // Mirrors the top-level rule at code-tabs.ts:52: a single code block
        // with neither lang nor meta stays as plain <pre><code>.
        const tree = mdxish('<Tabs>\n<Tab title="x">\n\n```\nplain text\n```\n\n</Tab>\n</Tabs>');

        expect(findElementByTagName(tree, 'CodeTabs')).toBeNull();
        const code = findElementByTagName(tree, 'code');
        expect(code).toMatchObject({ type: 'element', tagName: 'code' });
      });

      it('wraps a fenced code block nested inside a list item inside <Tabs>', () => {
        const tree = mdxish(
          '<Tabs>\n<Tab title="x">\n\n1. Step\n\n   ```js\n   const x = 1;\n   ```\n\n</Tab>\n</Tabs>',
        );

        const codeTabs = findElementByTagName(tree, 'CodeTabs');
        expect(codeTabs).not.toBeNull();
        const code = findElementByTagName(codeTabs as Element, 'code');
        expect(code).toMatchObject({
          properties: { className: ['language-js'], lang: 'js' },
        });
      });
    });
  });
});
