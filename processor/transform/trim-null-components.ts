import type { Root } from 'mdast';

import { visit } from 'unist-util-visit';

import * as Components from '../../components';
import { isMDXElement } from '../utils';

const trimNullComponents =
  ({ components }) =>
  (tree: Root) => {
    visit(
      tree,
      isMDXElement,
      (node, index, parent) => {
        if (node.name in components || node.name in Components) return;

        parent.children.splice(index, 1);
      },
      true,
    );
  };

export default trimNullComponents;
