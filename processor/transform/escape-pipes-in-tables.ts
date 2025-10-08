import { SKIP, visit } from 'unist-util-visit';

export const escapePipesInTables = () => tree => {
  visit(tree, 'table', tableNode => {
    visit(tableNode, leaf => {
      if (!('value' in leaf)) return;

      if (leaf.value.match(/|/g)) {
        leaf.value = leaf.value.replaceAll(/\|/g, '\\|');
      }
    });

    return SKIP;
  });
};
