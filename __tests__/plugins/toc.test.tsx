import { render, screen } from '@testing-library/react';
import React from 'react';
import { renderToString } from 'react-dom/server';

import { compile, run } from '../../index';

describe('toc transformer', () => {
  it('parses out a toc with max depth of 2', () => {
    const md = `
# Title

## Subheading

### Third

## Second Subheading
`;
    const { Toc } = run(compile(md));

    render(<Toc />);

    expect(screen.findByText('Title')).toBeDefined();
    expect(screen.findByText('Subheading')).toBeDefined();
    expect(screen.queryByText('Third')).toBeNull();
    expect(screen.findByText('Second Subheading')).toBeDefined();
  });

  it('parses a toc from components', () => {
    const md = `
# Title

<CommonInfo />

## Subheading
`;
    const components = {
      CommonInfo: '## Common Heading',
    };
    const executed = {
      CommonInfo: run(compile('## Common Heading')),
    };

    const { Toc } = run(compile(md, { components }), { components: executed });

    render(<Toc />);

    expect(screen.findByText('Title')).toBeDefined();
    expect(screen.findByText('Common Heading')).toBeDefined();
    expect(screen.findByText('Subheading')).toBeDefined();
  });

  it('parses out a toc and only uses plain text', () => {
    const md = `
# [Title](http://example.com)
`;
    const { Toc } = run(compile(md));

    render(<Toc />);

    expect(screen.findByText('Title')).toBeDefined();
    expect(screen.queryByText('[', { exact: false })).toBeNull();
  });

  it('does not inject a toc if one already exists', () => {
    const md = `
## Test Heading

export const toc = [
  {
    "type": "element",
    "tagName": "h2",
          "properties": {
        "id": "test-heading"
      },
    "children": [
      {
        "type": "text",
        "value": "Modified Table",
      }
    ],
  }
]
    `;

    const { toc } = run(compile(md));

    expect(toc).toMatchInlineSnapshot(`
      [
        {
          "children": [
            {
              "type": "text",
              "value": "Modified Table",
            },
          ],
          "properties": {
            "id": "test-heading",
          },
          "tagName": "h2",
          "type": "element",
        },
      ]
    `);
  });

  it('does not include headings in callouts', () => {
    const md = `
### Title

> 📘 Callout
`;
    const { Toc } = run(compile(md));

    render(<Toc />);

    expect(screen.findByText('Title')).toBeDefined();
    expect(screen.queryByText('Callout')).toBeNull();
  });

  it('includes headings from nested component tocs', () => {
    const md = `
    # Title

    <ParentInfo />
    `;

    const components = {
      ParentInfo: '## Parent Heading',
    };

    const parentModule = run(compile(components.ParentInfo));

    const executed = {
      ParentInfo: parentModule,
    };

    const { Toc } = run(compile(md, { components }), { components: executed });

    render(<Toc />);

    expect(screen.findByText('Parent Heading')).toBeDefined();
  });

  it('preserves nesting even when jsx elements are in the doc', () => {
    const md = `
# Title

## SubHeading

<Comp>
  First
</Comp>

<Comp>
  Second
</Comp>
`;

    const components = {
      Comp: 'export const Comp = ({ children }) => { return children; }',
    };

    const compModule = run(compile(components.Comp));
    const { Toc } = run(compile(md, { components }), { components: { Comp: compModule } });

    const html = renderToString(<Toc />);
    expect(html).toMatchInlineSnapshot(`
      "<nav aria-label="Table of contents" role="navigation"><ul class="toc-list"><li><a class="tocHeader" href="#"><i class="icon icon-text-align-left"></i>Table of Contents</a></li><li class="toc-children"><ul>
      <li><a href="#title">Title</a></li>
      <li>
      <ul>
      <li><a href="#subheading">SubHeading</a></li>
      </ul>
      </li>
      </ul></li></ul></nav>"
    `);
  });
});
