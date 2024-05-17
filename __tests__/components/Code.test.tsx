import React from 'react';
import { vi } from 'vitest';

import Code from '../../components/Code';

import { fireEvent, render, screen } from '@testing-library/react';
import copy from 'copy-to-clipboard';

const codeProps = {
  copyButtons: true,
};

vi.mock('@readme/syntax-highlighter', () => ({
  default: code => {
    return <span>{code.replace(/<<.*?>>/, 'VARIABLE_SUBSTITUTED')}</span>;
  },
  canonical: lang => lang,
}));

describe('Code', () => {
  it.skip('copies the variable interpolated code', () => {
    const props = {
      children: ['console.log("<<name>>");'],
    };

    const { container } = render(<Code {...codeProps} {...props} />);

    expect(container).toHaveTextContent(/VARIABLE_SUBSTITUTED/);
    fireEvent.click(screen.getByRole('button'));

    expect(copy).toHaveBeenCalledWith(expect.stringMatching(/VARIABLE_SUBSTITUTED/));
  });

  it('does not nest the button inside the code block', () => {
    render(<Code {...codeProps}>{'console.log("hi");'}</Code>);
    const btn = screen.getByRole('button');

    expect(btn.parentNode?.nodeName.toLowerCase()).not.toBe('code');
  });

  it('allows undefined children?!', () => {
    const { container } = render(<Code />);

    expect(container).toHaveTextContent('');
  });
});
