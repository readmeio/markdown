jest.mock('@readme/syntax-highlighter', () => ({
  default: code => {
    return <span>{code.replace(/<<.*?>>/, 'VARIABLE_SUBSTITUTED')}</span>;
  },
  canonical: lang => lang,
}));

const { mount } = require('enzyme');
const React = require('react');
const copy = require('copy-to-clipboard');

const Code = require('../../components/Code')({ attributes: {} }, { copyButtons: true });

describe('Code', () => {
  it('copies the variable interpolated code', () => {
    const props = {
      children: ['console.log("<<name>>");'],
    };

    const code = mount(<Code {...props} />);

    expect(code.text()).toMatch(/VARIABLE_SUBSTITUTED/);
    code.find('button').simulate('click');

    expect(copy).toHaveBeenCalledWith(expect.stringMatching(/VARIABLE_SUBSTITUTED/));
  });
});
