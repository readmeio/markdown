import type { RMDXModule } from '../../../types';
import type { Element, Text } from 'hast';

import React from 'react';
import { visit } from 'unist-util-visit';

import { mdxish, compile, run } from '../../../lib';
import { findAllElementsByTagName, findElementByTagName, parseMdxish } from '../../helpers';

describe('end-to-end tests in the mdxish pipeline for various types and variations of MDX components', () => {
  // Create & compile example component
  const exampleComponentCode = `
export const ExampleComponent = ({ header, body, children }) => {
  return (
    <div className="flex justify-center">
      <div className="rounded-md p-6 m-4">
        <p className="text-lg font-bold">{header}</p>
      </div>
      <div className="rounded-md p-6 m-4">
        <p className="text-lg font-bold">{body}</p>
      </div>
      <div className="rounded-md p-6 m-4">
        {children}
      </div>
    </div>
  );
};

<ExampleComponent header="Getting Started with Custom Components" />
  `;
  const compiledExampleComponentCode = run(compile(exampleComponentCode));
  const exampleComponents: Record<string, RMDXModule> = {
    ExampleComponent: compiledExampleComponentCode,
  };

  it('should create an element node with the correct component name and attributes', () => {
    const md = '<ExampleComponent header="This is a header" body="This is a body" />';
    const tree = mdxish(md, { components: exampleComponents });

    expect(tree.children).toHaveLength(1);
    const element = tree.children[0] as Element;
    expect(element.tagName).toBe('ExampleComponent');
    expect(element.properties?.header).toBe('This is a header');
    expect(element.properties?.body).toBe('This is a body');
  });

  it('should parse component when sandwiched between other text', () => {
    const md = 'Before <ExampleComponent body="This is a body" /> After';
    const tree = mdxish(md, { components: exampleComponents });

    // Content nodes are wrapped in a paragraph node
    const content = (tree.children[0] as Element);
    expect(content.children).toHaveLength(3);

    const firstText = content.children[0] as Text;
    expect(firstText.value).toBe('Before ');
    const lastText = content.children[2] as Text;
    expect(lastText.value).toBe(' After');

    const componentNode = content.children[1] as Element;
    expect(componentNode.tagName).toBe('ExampleComponent');
    expect(componentNode.properties?.body).toBe('This is a body');
  });

  it('should handle attributes with template literals as a prop', () => {
    const md = '<ExampleComponent header={`This is a header`} body={`This is a body`} />';
    const tree = mdxish(md, { components: exampleComponents });

    expect(tree.children).toHaveLength(1);
    const element = tree.children[0] as Element;
    expect(element.tagName).toBe('ExampleComponent');
    expect(element.properties?.header).toBe('This is a header');
    expect(element.properties?.body).toBe('This is a body');
  });

  it('should parse a component with a string template literal as a prop containing special characters', () => {
    const md = '<ExampleComponent header={`Special characters: < > & " \n ; /`} />';
    const tree = mdxish(md, { components: exampleComponents });

    expect(tree.children).toHaveLength(1);
    const element = tree.children[0] as Element;
    expect(element.tagName).toBe('ExampleComponent');
    expect(element.properties?.header).toBe('Special characters: < > & " \n ; /');
  });

  describe('with complex prop values', () => {
    it('should parse a component with an array as a prop', () => {
      const componentWithArrayCode = `
export const AdvancedTable = ({ data }) => {
  return (
    <div>
      {data.map((item, index) => (
        <div key={index}>{item.code}: {item.status}</div>
      ))}
    </div>
  );
};

<AdvancedTable
  data={[
    {
      'code': 'EXAMPLE_CODE_1',
      'status': 'EXAMPLE_STATUS_1'
    },
    {
      'code': 'EXAMPLE_CODE_2',
      'status': 'EXAMPLE_STATUS_2'
    },
  ]}
/>
            `;

      const compiledComponentWithArrayCode = run(compile(componentWithArrayCode));
      const exampleComponentsWithArray: Record<string, RMDXModule> = {
        AdvancedTable: compiledComponentWithArrayCode,
      };

      const md = `
<AdvancedTable
  data={[
    {
      'code': '<INPUT_CODE_1>',
      'status': '<INPUT_STATUS_1>',
    },
    {
      'code': '<INPUT_CODE_2>',
      'status': '<INPUT_STATUS_2>',
    }
  ]}
/>
      `;
      const tree = mdxish(md, { components: exampleComponentsWithArray });

      const componentNode = tree.children[0] as Element;
      expect(componentNode.tagName).toBe('AdvancedTable');
      // Array props survive as real JS values — the rehypeRaw passThrough keeps
      // the mdx-jsx node off parse5's string-only HTML round-trip.
      expect(componentNode.properties?.data).toStrictEqual([
        { code: '<INPUT_CODE_1>', status: '<INPUT_STATUS_1>' },
        { code: '<INPUT_CODE_2>', status: '<INPUT_STATUS_2>' },
      ]);
    });

    it('should parse a component with array props containing special characters', () => {
      const componentWithApostropheCode = `
export const ApostropheTable = ({ data }) => {
  return (
    <div>
      {data.length}
    </div>
  );
};

<ApostropheTable
  data={[
    {
      'message': "The <API_KEY> doesn't match the project."
    }
  ]}
/>
      `;

      const compiledComponentWithApostropheCode = run(compile(componentWithApostropheCode));
      const exampleComponentsWithApostrophe: Record<string, RMDXModule> = {
        ApostropheTable: compiledComponentWithApostropheCode,
      };

      const md = `
<ApostropheTable
  data={[
    {
      'message': "The <API_KEY> doesn't match the project."
    }
  ]}
/>
      `;
      const tree = mdxish(md, { components: exampleComponentsWithApostrophe });

      const componentNode = tree.children[0] as Element;
      expect(componentNode.tagName).toBe('ApostropheTable');
      expect(componentNode.properties?.data).toStrictEqual([
        { message: "The <API_KEY> doesn't match the project." },
      ]);
    });

    it('should parse a component with multiline props', () => {
      const componentWithMultilinePropsCode = `
export const ContentModal = ({
  label,
  title,
  content
}) => {
  return (
    <div>
      <div>{label}</div>
      <h2>{title}</h2>
      <p>{content}</p>
    </div>
  );
};

<ContentModal
  label="Open Content Modal"
  title="Content Modal"
  content={\`Lorem ipsum dolor sit amet,
  consectetur adipiscing elit.
  Sed do eiusmod tempor incididunt ut
  labore et dolore magna aliqua.\`}
/>
      `;

      const compiledComponentWithMultilinePropsCode = run(compile(componentWithMultilinePropsCode));
      const exampleComponentsWithArray: Record<string, RMDXModule> = {
        ContentModal: compiledComponentWithMultilinePropsCode,
      };

      const md = `
<ContentModal
  label="Open Content Modal"
  title="Content Modal"
  content={\`Lorem ipsum dolor sit amet,
consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut
labore et dolore magna aliqua.\`}
/>
      `;
      const tree = mdxish(md, { components: exampleComponentsWithArray });

      const componentNode = tree.children[0] as Element;
      expect(componentNode.tagName).toBe('ContentModal');
      expect(componentNode.properties).toMatchObject({
        label: 'Open Content Modal',
        title: 'Content Modal',
        content: `Lorem ipsum dolor sit amet,
consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut
labore et dolore magna aliqua.`,
      });
    });

    it('should parse a component with an array prop whose field is a JSX fragment', () => {
      const md = '<ExampleComponent items={[{ description: <>a <a href="x">b</a></> }]} />';
      const tree = mdxish(md, { components: exampleComponents });

      const componentNode = tree.children[0] as Element;
      expect(componentNode.tagName).toBe('ExampleComponent');

      const { items } = componentNode.properties as { items?: unknown };
      expect(Array.isArray(items)).toBe(true);

      // JSX in the expression evaluates to a real React element (deferred past
      // rehypeRaw's clone), so the field survives as an element, not a string.
      const [first] = items as { description: unknown }[];
      expect(React.isValidElement(first.description)).toBe(true);
    });

    it('should parse a component with a single JSX element as a prop', () => {
      const md = '<ExampleComponent label={<span>hi</span>} />';
      const tree = mdxish(md, { components: exampleComponents });

      const componentNode = tree.children[0] as Element;
      expect(componentNode.tagName).toBe('ExampleComponent');
      expect(React.isValidElement(componentNode.properties?.label)).toBe(true);
    });

    it('should treat JSX-looking text inside a string expression as a literal, not JSX', () => {
      // `<Home>` would match a naive `<tag` regex, but the estree has no JSX node here,
      // so the expression must evaluate to the plain string rather than a React element.
      const md = "<ExampleComponent body={'visit <Home> now'} />";
      const tree = mdxish(md, { components: exampleComponents });

      const componentNode = tree.children[0] as Element;
      expect(componentNode.tagName).toBe('ExampleComponent');
      expect(componentNode.properties?.body).toBe('visit <Home> now');
    });

    it('should evaluate a non-JSX attribute expression using the exported-const scope', () => {
      const md = `export const greeting = "hi".toUpperCase();

<ExampleComponent body={greeting} />`;
      const tree = mdxish(md, { components: exampleComponents });

      let componentNode: Element | undefined;
      visit(tree, 'element', (node: Element) => {
        if (node.tagName === 'ExampleComponent') componentNode = node;
      });

      expect(componentNode?.properties?.body).toBe('HI');
    });
  });

  it('should not evaluate an attribute expression if in safe mode', () => {
    const md = '<ExampleComponent header={1+1} body={"HELLO".toLowerCase()} />';
    const tree = mdxish(md, { components: exampleComponents, safeMode: true });

    expect(tree.children).toHaveLength(1);
    const element = tree.children[0] as Element;
    expect(element.tagName).toBe('ExampleComponent');
    expect(element.properties?.header).toBe('{1+1}');
    expect(element.properties?.body).toBe('{"HELLO".toLowerCase()}');
  });

  it('should not evaluate a JSX attribute expression if in safe mode', () => {
    const md = '<ExampleComponent items={[{ description: <>hi</> }]} />';
    const tree = mdxish(md, { components: exampleComponents, safeMode: true });

    const element = tree.children[0] as Element;
    expect(element.tagName).toBe('ExampleComponent');
    expect(element.properties?.items).toBe('{[{ description: <>hi</> }]}');
  });

  it('should recognize nested components', () => {
    const md = '<ExampleComponent body="This is outer content"><ExampleComponent body="This is inner content" /></ExampleComponent>';
    const tree = mdxish(md, { components: exampleComponents });

    expect(tree.children).toMatchObject([
      {
        type: 'element',
        tagName: 'p',
        children: [
          {
            type: 'element',
            tagName: 'ExampleComponent',
            properties: {
              body: 'This is outer content',
            },
            children: [{
              type: 'element',
              tagName: 'ExampleComponent',
              properties: {
                body: 'This is inner content',
              },
              children: [],
            }]
          },
        ],
      },
    ]);
  });

  it('should render a component nested inside a plain HTML wrapper', () => {
    const md = '<p><ExampleComponent body="This is a body" /></p>';
    const tree = mdxish(md, { components: exampleComponents });

    expect(tree.children).toMatchObject([
      {
        type: 'element',
        tagName: 'p',
        children: [
          {
            type: 'element',
            tagName: 'ExampleComponent',
            properties: {
              body: 'This is a body',
            },
            children: [],
          },
        ],
      },
    ]);
  });

  it('should not identify an MDX component syntax inside a code block', () => {
    const md = '```jsx\n<ExampleComponent body="This is a body" />\n```';
    const tree = mdxish(md, { components: exampleComponents });

    let exampleComponentNode: Element | undefined;
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'ExampleComponent') {
        exampleComponentNode = node;
      }
    });
    expect(exampleComponentNode).toBeUndefined();
  });

  describe('inline components with expression attributes', () => {
    it('should concatenate expression attributes', () => {
      const md = "<Anchor label=\"Merchant Sign-Up API Documentation\" target=\"_blank\" href={'https://' + 'www.example.com' + '/reference/sign-up-api'}>Link</Anchor>";
      const tree = mdxish(md, { newEditorTypes: true });
      const anchor = findElementByTagName(tree, 'Anchor');
      expect(anchor).toMatchObject({
        type: 'element',
        tagName: 'Anchor',
        properties: {
          label: 'Merchant Sign-Up API Documentation',
          target: '_blank',
          href: 'https://www.example.com/reference/sign-up-api',
        },
        children: [{ type: 'text', value: 'Link' }],
      });
    });

    it('should render an Anchor whose href is a concatenation expression', () => {
      const md =
        "<Anchor label=\"Docs\" target=\"_blank\" href={'https://' + user.docsUrl + '/x'}>Docs</Anchor>.";
      const tree = mdxish(md, { newEditorTypes: true });
      const anchor = findElementByTagName(tree, 'Anchor');
      expect(anchor).toMatchObject({
        type: 'element',
        tagName: 'Anchor',
        properties: {
          label: 'Docs',
          target: '_blank',
          href: "'https://' + user.docsUrl + '/x'",
        },
        children: [{ type: 'text', value: 'Docs' }],
      });
    });

    it('should keep trailing text after the closing tag as a sibling', () => {
      const md = "Start <Anchor href={'a' + 'b'}>Link</Anchor> done.";
      const tree = mdxish(md, { newEditorTypes: true });
      const paragraph = tree.children[0] as Element;
      const [start, anchor, trailing] = paragraph.children;
      expect(start).toMatchObject({ type: 'text', value: 'Start ' });
      expect(anchor).toMatchObject({
        type: 'element',
        tagName: 'Anchor',
        properties: {
          href: 'ab',
        },
        children: [{ type: 'text', value: 'Link' }],
      });
      expect(trailing).toMatchObject({ type: 'text', value: ' done.' });
    });
  });

  describe('fenced code with an unbalanced brace inside a Callout (CX-3704)', () => {
    const md = `<Callout icon="⚠️" theme="warn">
  **Title line**

  Intro paragraph inside the callout.

  \`\`\`
  {
  \`\`\`

  Closing paragraph inside the callout.
</Callout>

* **After-marker bullet**

  Indented continuation after the callout.

Final plain paragraph at end of file.`;

    it('closes the callout at </Callout> and renders following content outside it', () => {
      const tree = mdxish(md);

      // Exactly one Callout, and the content after </Callout> is NOT swallowed.
      const callouts = findAllElementsByTagName(tree, 'Callout');
      expect(callouts).toHaveLength(1);

      // The after-marker bullet renders as a real list, not a literal `*`
      // paragraph, and that list lives OUTSIDE the callout.
      expect(findAllElementsByTagName(tree, 'ul')).toHaveLength(1);
      expect(findAllElementsByTagName(callouts[0], 'ul')).toHaveLength(0);

      // The unbalanced `{` stays inside a code block within the callout.
      const pre = findElementByTagName(callouts[0], 'pre');
      expect(pre).not.toBeNull();
      expect(JSON.stringify(pre)).toContain('{');
    });

    it('does not strand a literal </Callout> in the output', () => {
      const tree = mdxish(md);
      expect(JSON.stringify(tree)).not.toContain('</Callout>');
    });
  });

  describe('components under list items (CX-3940)', () => {
    // Lines indented below the item's content column are CommonMark "lazy" lines. The
    // tokenizer used to stop claiming at the first one, leaving a truncated opener as raw html.
    const itemWithCallout = {
      type: 'listItem',
      children: [
        { type: 'paragraph', children: [{ type: 'text', value: 'one' }] },
        {
          type: 'mdxJsxFlowElement',
          name: 'Callout',
          attributes: [{ type: 'mdxJsxAttribute', name: 'icon', value: '📘' }],
          children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Body' }] }],
        },
      ],
    };

    it.each([
      ['column 0 under a bullet', '- one\n<Callout icon="📘">\nBody\n</Callout>'],
      ['one space under a bullet', '- one\n <Callout icon="📘">\n Body\n </Callout>'],
      ['two spaces under an ordered item', '1. one\n  <Callout icon="📘">\n  Body\n  </Callout>'],
      ['the content column under an ordered item', '1. one\n   <Callout icon="📘">\n   Body\n   </Callout>'],
      ['the content column after a blank line', '- one\n\n  <Callout icon="📘">\n  Body\n  </Callout>'],
      ['a body indented deeper than its tags', '- one\n<Callout icon="📘">\n    Body\n</Callout>'],
    ])('keeps a component inside the item when indented at %s', (_, md) => {
      expect(parseMdxish(md)).toMatchObject({
        type: 'root',
        children: [{ type: 'list', children: [itemWithCallout] }],
      });
    });

    it('renders a readme component inside the <li>', () => {
      const md = '- three\n<Callout icon="📘" theme="info">\nThis is an MDX-style callout component.\n</Callout>';
      expect(mdxish(md).children).toMatchObject([
        {
          type: 'element',
          tagName: 'ul',
          children: [
            { type: 'text', value: '\n' },
            {
              type: 'element',
              tagName: 'li',
              children: [
                { type: 'text', value: 'three\n' },
                {
                  type: 'element',
                  tagName: 'Callout',
                  properties: { icon: '📘', theme: 'info' },
                  children: [
                    {
                      type: 'element',
                      tagName: 'p',
                      children: [{ type: 'text', value: 'This is an MDX-style callout component.' }],
                    },
                  ],
                },
                { type: 'text', value: '\n' },
              ],
            },
            { type: 'text', value: '\n' },
          ],
        },
      ]);
    });

    it('parses markdown inside a custom component body', () => {
      const md = '- one\n<ExampleComponent header="h">\n**bold** body\n</ExampleComponent>';
      const tree = mdxish(md, { components: exampleComponents });
      expect(findElementByTagName(tree, 'li')?.children).toMatchObject([
        { type: 'text', value: 'one\n' },
        {
          type: 'element',
          tagName: 'ExampleComponent',
          properties: { header: 'h' },
          children: [
            {
              type: 'element',
              tagName: 'p',
              children: [
                { type: 'element', tagName: 'strong', children: [{ type: 'text', value: 'bold' }] },
                { type: 'text', value: ' body' },
              ],
            },
          ],
        },
        { type: 'text', value: '\n' },
      ]);
    });

    it('promotes nested components', () => {
      const md = '- one\n<Steps>\n  <Step>First, install the dependencies.</Step>\n</Steps>';
      expect(parseMdxish(md)).toMatchObject({
        children: [
          {
            type: 'list',
            children: [
              {
                type: 'listItem',
                children: [
                  { type: 'paragraph', children: [{ type: 'text', value: 'one' }] },
                  {
                    type: 'mdxJsxFlowElement',
                    name: 'Steps',
                    children: [
                      {
                        type: 'mdxJsxFlowElement',
                        name: 'Step',
                        children: [
                          { type: 'paragraph', children: [{ type: 'text', value: 'First, install the dependencies.' }] },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('keeps a fenced code block inside the component body', () => {
      const md = '- one\n<Callout icon="📘">\n```js\nconst x = 1;\n```\n</Callout>';
      expect(parseMdxish(md)).toMatchObject({
        children: [
          {
            type: 'list',
            children: [
              {
                type: 'listItem',
                children: [
                  { type: 'paragraph', children: [{ type: 'text', value: 'one' }] },
                  {
                    type: 'mdxJsxFlowElement',
                    name: 'Callout',
                    children: [{ type: 'code-tabs', children: [{ type: 'code', lang: 'js', value: 'const x = 1;' }] }],
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it.each([
      ['attributes on their own lines', '- two\n<ExampleComponent\nbody={\n`Test content\n`}\n/>'],
      ['the template literal opened on the tag line', '- two\n<ExampleComponent body={`Test content\n`} />'],
      ['two spaces under an ordered item', '1. two\n  <ExampleComponent\n  body={`Test content\n`}\n  />'],
    ])('keeps a multi-line attribute expression together with %s', (_, md) => {
      const tree = mdxish(md, { components: exampleComponents });
      expect(findElementByTagName(tree, 'li')?.children).toMatchObject([
        { type: 'text', value: 'two\n' },
        { type: 'element', tagName: 'ExampleComponent', properties: { body: 'Test content\n' }, children: [] },
        { type: 'text', value: '\n' },
      ]);
    });

    it('does not corrupt raw html that follows the component', () => {
      // The truncated opener left parse5 mid-tag, so the next raw tag threw
      // "Cannot read properties of null (reading 'tagName')".
      const md = '- one\n<ExampleComponent\nbody={`x`}\n/>\n- two <b>bold</b>';
      const tree = mdxish(md, { components: exampleComponents });
      expect(findAllElementsByTagName(tree, 'li')).toMatchObject([
        {
          children: [
            { type: 'text', value: 'one\n' },
            { type: 'element', tagName: 'ExampleComponent', properties: { body: 'x' }, children: [] },
            { type: 'text', value: '\n' },
          ],
        },
        {
          children: [
            { type: 'text', value: 'two ' },
            { type: 'element', tagName: 'b', children: [{ type: 'text', value: 'bold' }] },
          ],
        },
      ]);
    });

    it('keeps following items and text outside the component', () => {
      const md = '- one\n<Callout icon="📘">\nBody\n</Callout>\n- two\n\nAfter the list';
      expect(parseMdxish(md)).toMatchObject({
        children: [
          {
            type: 'list',
            children: [itemWithCallout, { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'two' }] }] }],
          },
          { type: 'paragraph', children: [{ type: 'text', value: 'After the list' }] },
        ],
      });
    });

    it('binds to the innermost nested item', () => {
      const md = '- outer\n  - one\n<Callout icon="📘">\nBody\n</Callout>';
      expect(parseMdxish(md)).toMatchObject({
        children: [
          {
            type: 'list',
            children: [
              {
                type: 'listItem',
                children: [
                  { type: 'paragraph', children: [{ type: 'text', value: 'outer' }] },
                  { type: 'list', children: [itemWithCallout] },
                ],
              },
            ],
          },
        ],
      });
    });

    it('keeps a component inside a blockquote when its lines drop the > prefix', () => {
      const md = '> quote\n<Callout icon="📘">\nBody\n</Callout>';
      expect(parseMdxish(md)).toMatchObject({
        children: [
          {
            type: 'blockquote',
            children: [{ type: 'paragraph', children: [{ type: 'text', value: 'quote' }] }, itemWithCallout.children[1]],
          },
        ],
      });
    });

    it('ends the list when a blank line precedes an unindented component', () => {
      const md = '- two\n\n<ExampleComponent header="h" />';
      expect(parseMdxish(md)).toMatchObject({
        children: [
          { type: 'list', children: [{ type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'two' }] }] }] },
          { type: 'mdxJsxFlowElement', name: 'ExampleComponent', children: [] },
        ],
      });
    });

    it('ends the item at a single-line component on an under-indented line', () => {
      // Only a token still open across the line keeps the item open; a one-line claim closes it.
      const md = '- one\n<ExampleComponent header="h" />\n- two';
      expect(parseMdxish(md)).toMatchObject({
        children: [
          { type: 'list', children: [{ type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'one' }] }] }] },
          { type: 'mdxJsxFlowElement', name: 'ExampleComponent', children: [] },
          { type: 'list', children: [{ type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'two' }] }] }] },
        ],
      });
    });

    it('falls back without throwing when the component is never closed', () => {
      const md = '- one\n<Callout icon="📘">\nBody\n';
      expect(parseMdxish(md)).toMatchObject({
        children: [
          {
            type: 'list',
            children: [
              {
                type: 'listItem',
                children: [
                  { type: 'paragraph', children: [{ type: 'text', value: 'one' }] },
                  { type: 'html', value: '<Callout icon="📘">' },
                  { type: 'paragraph', children: [{ type: 'text', value: 'Body' }] },
                ],
              },
            ],
          },
        ],
      });
      expect(() => mdxish(md)).not.toThrow();
    });
  });
});
