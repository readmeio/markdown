import type { Root } from 'hast';

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import * as rmdx from '../../index';

describe('variable compiler', () => {
  it('compiles back to the original mdx', () => {
    const mdx = `
## Hello!

{user.name}

### Bye bye!
    `;
    const tree = rmdx.mdast(mdx);

    expect(rmdx.mdx(tree).trim()).toStrictEqual(mdx.trim());
  });

  it('with spaces in a variable, it compiles back to the original', () => {
    const mdx = '{user["oh no"]}';
    const tree = rmdx.mdast(mdx);

    expect(rmdx.mdx(tree).trim()).toStrictEqual(mdx.trim());
  });

  it('with dashes in a variable name, it compiles back to the original', () => {
    const mdx = '{user["oh-no"]}';
    const tree = rmdx.mdast(mdx);

    expect(rmdx.mdx(tree).trim()).toStrictEqual(mdx.trim());
  });

  it('with unicode in the variable name, it compiles back to the original', () => {
    const mdx = '{user.nuñez}';
    const tree = rmdx.mdast(mdx);

    expect(rmdx.mdx(tree).trim()).toStrictEqual(mdx.trim());
  });

  it('with quotes in the variable name, it compiles back to the original', () => {
    const mdx = '{user[`"\'wth`]}';
    const tree = rmdx.mdast(mdx);

    expect(rmdx.mdx(tree).trim()).toStrictEqual(mdx.trim());
  });
});

describe('mdxish variable compiler', () => {
  it('should handle user variables', () => {
    const mdx = `
Hello {user.name}!
    `;

    const variables = {
      user: {
        name: 'John Doe',
      },
      defaults: [],
    };

    const hast = rmdx.mdxish(mdx) as Root;
    expect(hast).toBeDefined();

    const { default: Content } = rmdx.renderMdxish(hast, { variables });

    render(React.createElement(Content));

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should evaluate user variables inside backticks (inline code)', () => {
    const mdx = `
User Variables: **\`{user.name}\`** evaluates to {user.name}
    `;

    const variables = {
      user: {
        name: 'John Doe',
      },
      defaults: [],
    };

    const hast = rmdx.mdxish(mdx, { variables }) as Root;
    expect(hast).toBeDefined();

    const { default: Content } = rmdx.renderMdxish(hast, { variables });

    render(React.createElement(Content));

    // Both {user.name} inside and outside backticks should be evaluated to "John Doe"
    const johnDoeElements = screen.getAllByText('John Doe');
    expect(johnDoeElements).toHaveLength(2);

    // Verify one is inside a code element (from backticks) and one is in a span (from outside backticks)
    const codeElement = johnDoeElements.find(el => el.tagName === 'CODE');
    const spanElement = johnDoeElements.find(el => el.tagName === 'SPAN');
    expect(codeElement).toBeInTheDocument();
    expect(spanElement).toBeInTheDocument();

    // The literal {user.name} should not appear anywhere
    expect(screen.queryByText('{user.name}')).not.toBeInTheDocument();
  });
});
