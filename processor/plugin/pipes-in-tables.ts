import { SKIP, visit } from 'unist-util-visit';

const rxEscapedPipe = /\\\|/g;

export const escapePipesInTables = () => tree => {
  console.log(JSON.stringify({ tree }, null, 2));
  visit(tree, 'table', tableNode => {
    visit(tableNode, leaf => {
      if (!('value' in leaf)) return;

      if (leaf.value.match(/|/g)) {
        leaf.value = leaf.value.replaceAll(/[|]/g, '\\|');
      }
    });

    return SKIP;
  });
};

export const unescapePipesInTables = () => tree => {};
