import type { Transform } from 'mdast-util-from-markdown';
import type { HTMLBlock } from 'types';

import { visit } from 'unist-util-visit';

const MigrateHtmlBlocks = (): Transform => tree => {
  visit(tree, 'html-block', (node: HTMLBlock) => {
    const { html, runScripts } = node.data?.hProperties || {};
    const escaped = html.replaceAll(/\\/g, '\\\\');

    node.data.hProperties = {
      ...(runScripts && { runScripts }),
      html: escaped,
    };
  });

  return tree;
};

export default MigrateHtmlBlocks;
