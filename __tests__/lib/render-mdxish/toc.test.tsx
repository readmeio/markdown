import { render, screen } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../index';

describe('toc transformer', () => {
  it('parses out a toc with max depth of 3', () => {
    const md = `
# Title

## Subheading

### Third

#### Fourth
`;
    const { Toc } = renderMdxish(mdxish(md));

    render(<Toc />);

    expect(screen.findByText('Title')).toBeDefined();
    expect(screen.findByText('Subheading')).toBeDefined();
    expect(screen.findByText('Third')).toBeDefined();
    expect(screen.queryByText('Fourth')).toBeNull();
  });

  it('parses a toc from components', () => {
    const md = `
# Title

<CommonInfo />

## Subheading
`;
    const components = {
      CommonInfo: renderMdxish(mdxish('## Common Heading')),
    };

    const { Toc } = renderMdxish(mdxish(md, { components }), { components });

    render(<Toc />);

    expect(screen.findByText('Title')).toBeDefined();
    expect(screen.findByText('Common Heading')).toBeDefined();
    expect(screen.findByText('Subheading')).toBeDefined();
  });

  it('parses out a toc and only uses plain text', () => {
    const md = `
# [Title](http://example.com)
`;
    const { Toc } = renderMdxish(mdxish(md));

    render(<Toc />);

    expect(screen.findByText('Title')).toBeDefined();
    expect(screen.queryByText('[', { exact: false })).toBeNull();
  });

  it('does not include headings in callouts', () => {
    const md = `
### Title

> 📘 Callout
`;
    const { Toc } = renderMdxish(mdxish(md));

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
      ParentInfo: renderMdxish(mdxish('## Parent Heading')),
    };

    const { Toc } = renderMdxish(mdxish(md, { components }), { components });

    render(<Toc />);

    expect(screen.findByText('Parent Heading')).toBeDefined();
  });
});
