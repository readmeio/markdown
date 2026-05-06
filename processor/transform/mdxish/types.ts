import type {
  Code,
  Html,
  List,
  Paragraph,
  PhrasingContent,
  RootContent,
  Table,
  TableCell,
  TableRow,
} from 'mdast';
import type { CodeTabs } from 'types';
import type { Position } from 'unist';

/**
 * Intermediate figure node before conversion to the final Figure type.
 * Produced by magicBlockTransformer (for magic block images with captions)
 * and by reassembleHtmlFigures (for raw HTML <figure> elements).
 */
export interface FigureNode {
  children: RootContent[];
  data?: {
    hName?: string;
  };
  position?: Position;
  type: 'figure';
}

/**
 * Table cell content for the mdxish pipeline. mdast’s `TableCell` is typed as
 * `PhrasingContent[]` only, but GFM / remark output and our transforms can
 * place block-level nodes (e.g. paragraphs, lists, code) inside cells.
 *
 * If there's more node types that should be allowed, add them here.
 */
export type MdxishTableCellContent =
  | Code
  | CodeTabs
  | Html
  | List
  | Paragraph
  | PhrasingContent;

/**
 * A `tableCell` that allows the same content the serializer accepts at runtime.
 */
export interface MdxishTableCell extends Omit<TableCell, 'children'> {
  children: MdxishTableCellContent[];
}

export interface MdxishTableRow extends Omit<TableRow, 'children'> {
  children: MdxishTableCell[];
}

export interface MdxishTable extends Omit<Table, 'children'> {
  children: MdxishTableRow[];
}

/** `Root` content when `table` is allowed to use the wider cell shape. */
export type MdxishMdastRootContent = Exclude<RootContent, Table> | MdxishTable;
