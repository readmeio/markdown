import type { IndexableElements } from '../../types';

import { render, screen } from '@testing-library/react';
import React from 'react';

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
      ChildInfo: '### Child Heading',
      ParentInfo: '## Parent Heading',
    };

    const childModule = run(compile('### Child Heading'));
    const parentModule = run(compile('## Parent Heading'));
    parentModule.toc.push({
      type: 'mdxJsxFlowElement',
      name: 'ChildInfo',
      attributes: [],
      children: [],
    } as IndexableElements);

    const executed = {
      ChildInfo: childModule,
      ParentInfo: parentModule,
    };

    const { Toc } = run(compile(md, { components }), { components: executed });

    render(<Toc />);

    expect(screen.findByText('Parent Heading')).toBeDefined();
    expect(screen.findByText('Child Heading')).toBeDefined();
  });
});
