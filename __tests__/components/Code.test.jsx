jest.mock('@readme/syntax-highlighter', () => ({
  default: code => {
    return <span>{code.replace(/<<.*?>>/, 'VARIABLE_SUBSTITUTED')}</span>;
  },
  canonical: lang => lang,
}));

const { fireEvent, render, screen } = require('@testing-library/react');
const copy = require('copy-to-clipboard');
const React = require('react');

const Code = require('../../components/Code')({ attributes: {} }, { copyButtons: true });

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
