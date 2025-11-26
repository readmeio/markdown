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

  it('should NOT evaluate user variables inside backticks (inline code)', () => {
    const mdx = `
Hello \`{user.name}\`!
    `;

    const variables = {
      user: {
        name: 'John Doe',
      },
    };

    const hast = rmdx.mdxish(mdx) as Root;
    expect(hast).toBeDefined();

    const { default: Content } = rmdx.renderMdxish(hast, { variables });

    render(React.createElement(Content));

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

    expect(screen.getByText('{user.name}')).toBeInTheDocument();
  });
});
