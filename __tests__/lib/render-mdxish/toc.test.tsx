import type { HastHeading } from '../../../types';

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

  it('includes headings from reusable components', () => {
    const md = `# Title

<BlockedComponent/>`;

    const blockedComponentModule = renderMdxish(mdxish('## Callout Heading'));
    const components = {
      BlockedComponent: blockedComponentModule,
    };

    const { toc } = renderMdxish(mdxish(md, { components }), { components });

    expect(toc).toHaveLength(2);
    const firstHeading = toc[0] as HastHeading;
    expect(firstHeading.tagName).toBe('h1');
    expect(firstHeading.properties?.id).toBe('title');
    const secondHeading = toc[1] as HastHeading;
    expect(secondHeading.tagName).toBe('h2');
    expect(secondHeading.properties?.id).toBe('callout-heading');
  });

  it('resolves variables in labels', () => {
    const md = `# Hello {user.name}!

## Setup for {user.role}s
`;
    const variables = {
      user: { name: 'John', role: 'admin' },
      defaults: [],
    };

    const { Toc } = renderMdxish(mdxish(md), { variables });

    render(<Toc />);

    expect(screen.findByText('Hello John!')).toBeDefined();
    expect(screen.findByText('Setup for admins')).toBeDefined();
  });

  it('keeps adjacent legacy variable values and suffixes together', () => {
    const md = '## Hello <<name>>! Nice';
    const variables = {
      user: {},
      defaults: [{ name: 'name', default: 'John Cena' }],
    };

    const { Toc } = renderMdxish(mdxish(md, { variables }), { variables });

    render(<Toc />);

    expect(screen.findByText('Hello John Cena! Nice')).toBeDefined();
    expect(screen.queryByText('Hello John Cena ! Nice')).toBeNull();
  });

  it('keeps mixed inline phrasing together', () => {
    const md = '## Hello {user.name}! N*ic*e [day](https://example.com)s';
    const variables = {
      user: { name: 'John' },
      defaults: [],
    };

    const { Toc } = renderMdxish(mdxish(md, { variables }), { variables });

    render(<Toc />);

    expect(screen.findByText('Hello John! Nice days')).toBeDefined();
    expect(screen.queryByText('Hello John! N ic e day s')).toBeNull();
  });

  it('preserves authored spaces around inline content', () => {
    const md = '## [Link](https://example.com) space';
    const { Toc } = renderMdxish(mdxish(md));

    render(<Toc />);

    expect(screen.findByText('Link space')).toBeDefined();
    expect(screen.queryByText('Linkspace')).toBeNull();
  });
});
