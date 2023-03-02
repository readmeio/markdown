import { fireEvent, render, screen } from '@testing-library/react';
import copy from 'copy-to-clipboard';
import React from 'react';

import CreateCode from '../../components/Code';

jest.mock('@readme/syntax-highlighter', () => ({
  default: code => {
    return <span>{code.replace(/<<.*?>>/, 'VARIABLE_SUBSTITUTED')}</span>;
  },
  canonical: lang => lang,
}));

const Code = CreateCode({ attributes: {} }, { copyButtons: true });

describe('Code', () => {
  it('copies the variable interpolated code', () => {
    const props = {
      children: ['console.log("<<name>>");'],
    };

    const { container } = render(<Code {...props} />);

    expect(container).toHaveTextContent(/VARIABLE_SUBSTITUTED/);
    fireEvent.click(screen.getByRole('button'));

    expect(copy).toHaveBeenCalledWith(expect.stringMatching(/VARIABLE_SUBSTITUTED/));
  });

  it('does not nest the button inside the code block', () => {
    render(<Code>{'console.log("hi");'}</Code>);
    const btn = screen.getByRole('button');

    expect(btn.parentNode.nodeName.toLowerCase()).not.toBe('code');
  });

  it('allows undefined children?!', () => {
    const { container } = render(<Code />);

    expect(container).toHaveTextContent('');
  });
});
