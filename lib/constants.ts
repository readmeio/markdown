/**
 * Pattern to match component tags (PascalCase or snake_case)
 */
export const componentTagPattern = /<(\/?[A-Z][A-Za-z0-9_]*)([^>]*?)(\/?)>/g;

/**
 * MDAST flow (block-level) content types that cannot be represented
 * inside GFM table cells. Used to decide whether a table should be
 * serialized as GFM or as JSX `<Table>` syntax.
 *
 * @see https://github.com/syntax-tree/mdast#flowcontent
 */
export const FLOW_TYPES = new Set([
  'blockquote',
  'code',
  'heading',
  'html',
  'list',
  'table',
  'thematicBreak',
]);

