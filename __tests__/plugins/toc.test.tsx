import React from 'react';
import { render, screen } from '@testing-library/react';
import { compile, run } from '../../index';

describe('toc transformer', () => {
  it('parses out a toc with max depth of 2', async () => {
    const md = `
# Title

## Subheading

### Third

## Second Subheading
`;
    const { Toc } = await run(compile(md));

    render(<Toc />);

    expect(screen.findByText('Title')).toBeDefined();
    expect(screen.findByText('Subheading')).toBeDefined();
    expect(screen.queryByText('Third')).toBeNull();
    expect(screen.findByText('Second Subheading')).toBeDefined();
  });

  it('parses a toc from components', async () => {
    const md = `
# Title

<CommonInfo />

## Subheading
`;
    const components = {
      CommonInfo: '## Common Heading',
    };
    const executed = {
      CommonInfo: await run(compile('## Common Heading')),
    };

    const { Toc } = await run(compile(md, { components }), { components: executed });

    render(<Toc />);

    expect(screen.findByText('Title')).toBeDefined();
    expect(screen.findByText('Common Heading')).toBeDefined();
    expect(screen.findByText('Subheading')).toBeDefined();
  });

  it('parses out a toc and only uses plain text', async () => {
    const md = `
# [Title](http://example.com)
`;
    const { Toc } = await run(compile(md));

    render(<Toc />);

    expect(screen.findByText('Title')).toBeDefined();
    expect(screen.queryByText('[', { exact: false })).toBeNull();
  });
});
