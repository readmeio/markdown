import { hast } from '../index';

describe('HTML sanitizing', () => {
  describe('code-tabs', () => {
    it('should allow code tabs as children of html', () => {
      const md = `
<p>

\`\`\`js
one
\`\`\`
\`\`\`js
two
\`\`\`

</p>
`;
      const tree = hast(md);

      expect(tree.children[1].properties.className).toStrictEqual(['code-tabs']);
    });
  });
});
