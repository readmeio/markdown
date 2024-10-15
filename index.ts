import type { $TSFixMe } from '@readme/iso';
import type { Code, InlineCode, Root, Table, TableCell, TableRow } from 'mdast';
import type { VFile } from 'vfile';

import * as rdmd from '@readme/markdown';
import visit, { SKIP } from 'unist-util-visit';

import emphasisTransfomer from './emphasis';
import imageTransformer from './images';
import linkReferenceTransformer from './linkReference';
import tableTransfomer from './table';

const magicIndex = (i: number, j: number) => `${i === 0 ? 'h' : `${i - 1}`}-${j}`;

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
const psuedoListRegex = /^(?<ws>[ \t]*)\\?[*_]\s*(?<item>.*)$/gm;

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

  // @ts-expect-error: the current version of visit is before the package
  // types/mdast was created
  visit(table, 'tableRow', (row: TableRow, i: number) => {
    // @ts-expect-error: the current version of visit is before the package
    // types/mdast was created
    visit(row, 'tableCell', (cell: TableCell, j: number) => {
      let children = cell.children;

      if (json && json.data[magicIndex(i, j)]) {
        const string = json.data[magicIndex(i, j)].replace(psuedoListRegex, '$1- $2');

        children = rdmd.mdast(string).children;
      }

      // eslint-disable-next-line no-param-reassign
      cell.children = children.length > 1 ? children : ([{ type: 'paragraph', children }] as $TSFixMe);

      return SKIP;
    });

    return SKIP;
  });

  // @ts-expect-error: the current version of visit is before the package
  // types/mdast was created
  visit(table, 'inlineCode', (code: Code | InlineCode) => {
    if (code.value.includes('\n')) {
      // eslint-disable-next-line no-param-reassign
      code.type = 'code';
    }
  });
};

const compatability =
  () =>
  (tree: Root, vfile: VFile): Root => {
    // @ts-expect-error: the current version of visit is before the package
    // types/mdast was created
    visit(tree, 'table', migrateTableCells(vfile));

    return tree;
  };

export const compatParser = (doc: string): Root => {
  const proc = rdmd
    .processor()
    .use(compatability)
    .use(emphasisTransfomer)
    .use(linkReferenceTransformer)
    .use(imageTransformer)
    .use(tableTransfomer);
  const tree = proc.parse(doc);
  proc.runSync(tree, doc);

  return tree;
};
