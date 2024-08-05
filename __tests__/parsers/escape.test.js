import { mdast } from '../../index';

describe('Escape', () => {
  it('uses the "escape" type', () => {
    const md = '\\&para;';
    expect(mdast(md, { settings: { position: true } })).toMatchSnapshot();
  });
});
