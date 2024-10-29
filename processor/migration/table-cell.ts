import type { Code, InlineCode, PhrasingContent, Root, Table, TableCell, TableRow } from 'mdast';
import type { VFile } from 'vfile';

import * as rdmd from '@readme/markdown-legacy';
import { visit, SKIP } from 'unist-util-visit';

const magicIndex = (i: number, j: number) => `${i === 0 ? 'h' : `${i - 1}`}-${j}`;
const isInlineHtml = node => node.type === 'html' && !node.block;

// @note: This regex is detect malformed lists that were created by the
// markdown editor. Consider the following markdown:
//
// ```
// * item 1
// * item 2
// * item 3
// ```
//
// This is a perfectly valid list. But when you put that text into a table
// cell, the editor does **bad** things. After a save and load cycle, it gets
// converted to this:
//
// ```
// \_ item 1
// \_ item 2
// \* item 3
// ```
//
// The following regex attempts to detect this pattern, and we'll convert it to
// something more standard.
const psuedoListRegex = /^(?!([*_]+).*\1$)(?<ws>[ \t]*)\\?([*_])\s*(?<item>.*)$/gm;

const migrateTableCells = (vfile: VFile) => (table: Table) => {
  let json;
  try {
    const { position } = table;

    if (position) {
      json = JSON.parse(
        vfile
          .toString()
          .slice(position.start.offset, position.end.offset)
          .replace(/.*\[block:parameters\](.*)\[\/block\].*/s, '$1'),
      );
    }
  } catch (err) {
    /**
     * This failure case is already handled by the following logic. Plus,
     * because it's being handled internally, there's no way for our
     * migration script to catch the error or keep track of it, and it just
     * ends up blowing up the output logs.
     */
    // console.error(err);
  }

  visit(table, 'tableRow', (row: TableRow, i: number) => {
    visit(row, 'tableCell', (cell: TableCell, j: number) => {
      let children = cell.children;

      if (json && json.data[magicIndex(i, j)]) {
        const string = json.data[magicIndex(i, j)].replace(psuedoListRegex, '$<ws>- $<item>');

        children = rdmd.mdast(string).children;
      }

      cell.children =
        children.length > 1 && !children.some(isInlineHtml)
          ? children
          : ([{ type: 'paragraph', children }] as PhrasingContent[]);

      return SKIP;
    });

    return SKIP;
  });

  visit(table, 'inlineCode', (code: Code | InlineCode) => {
    if (code.value.includes('\n')) {
      // eslint-disable-next-line no-param-reassign
      code.type = 'code';
    }
  });
};

const tableCellTransformer =
  () =>
  (tree: Root, vfile: VFile): Root => {
    visit(tree, 'table', migrateTableCells(vfile));

    return tree;
  };

export default tableCellTransformer;
