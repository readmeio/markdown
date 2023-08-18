import { visit } from 'unist-util-visit';

const reusableContent =
  ({ reusableContentBlocks }) =>
  () =>
  tree => {
    const parser = new DOMParser();
    console.log(reusableContentBlocks);

    visit(tree, 'html', (node, index, parent) => {
      const dom = parser.parseFromString(node.value, 'text/html');
      const maybe = dom.body.children[0];

      if (maybe?.tagName === 'README-REUSABLECONTENT') {
        const name = maybe.getAttribute('name');
        const block = reusableContentBlocks[name];

        if (block) {
          parent.children[index] = block;
        }
      }
    });

    return tree;
  };

export default reusableContent;
