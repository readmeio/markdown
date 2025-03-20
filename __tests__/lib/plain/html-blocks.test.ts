import { hast, plain } from '../../../index';

const Doc = `
<HTMLBlock>{\`
  <style>
  .container {
    display: flex;
  }
  </style>

  <div class="container">
    <div>Item 1</div>
    <div>Item 2</div>
  </div>
\`}</HTMLBlock>
`;

describe('plain compiler', () => {
  it('should parse html-blocks', () => {
    const string = plain(hast(Doc));
    expect(string).toBe('Item 1 Item 2');
  });
});
