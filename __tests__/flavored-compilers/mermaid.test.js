import { md } from '../../index';

describe('Compile Mermaid blocks', () => {
  it('compiles a mermaid block', () => {
    const value = `
graph LR
    A[Will it blend?] --> B[Yes]
`;

    const tree = {
      type: 'root',
      children: [
        {
          type: 'mermaid',
          value,
          data: {
            hName: 'mermaid',
            hProperties: {
              value,
            },
          },
        },
      ],
    };

    expect(md(tree)).toMatchSnapshot();
  });
});
