import type { Html, Node, Parents, Root, Table, TableCell, TableRow } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { mdxFromMarkdown } from 'mdast-util-mdx';
import { phrasing } from 'mdast-util-phrasing';
import { mdxjs } from 'micromark-extension-mdxjs';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { EXIT, visit } from 'unist-util-visit';

import { gemojiFromMarkdown } from '../../../../lib/mdast-util/gemoji';
import { legacyVariableFromMarkdown } from '../../../../lib/mdast-util/legacy-variable';
import { gemoji } from '../../../../lib/micromark/gemoji';
import { legacyVariable } from '../../../../lib/micromark/legacy-variable';
import { getAttrs, isMDXElement } from '../../../utils';
import calloutTransformer from '../../callouts';
import codeTabsTransformer from '../../code-tabs';
import { extractText } from '../../extract-text';
import normalizeEmphasisAST from '../normalize-malformed-md-syntax';

import { unwrapSoleParagraph } from './utils';

interface MdxJsxTableCell extends Omit<MdxJsxFlowElement, 'name'> {
  name: 'td' | 'th';
}

const isTableCell = (node: Node): node is MdxJsxTableCell => isMDXElement(node) && ['th', 'td'].includes(node.name);

const tableTypes = {
  tr: 'tableRow',
  th: 'tableCell',
  td: 'tableCell',
};

// we want to use remarkMdx here to utilise all its capabilities, but in order for
// it to not clash with any of our other tokenizers and so that we gain control over
// the tokenizer registration order, we manually register `mdxjs` and `mdxJsxFromMarkdown`
// which is basically the same as calling `use.remarkMdx()`
const tableNodeProcessor = unified()
  .data('micromarkExtensions', [mdxjs(), gemoji(), legacyVariable()])
  .data('fromMarkdownExtensions', [mdxFromMarkdown(), gemojiFromMarkdown(), legacyVariableFromMarkdown()])
  .use(remarkParse)
  .use(normalizeEmphasisAST)
  .use([[calloutTransformer, { isMdxish: true }], codeTabsTransformer])
  .use(remarkGfm);

/**
 * Check if children are only text nodes that might contain markdown
 */
const isTextOnly = (children: unknown[]): boolean => {
  return children.every(child => {
    if (child && typeof child === 'object' && 'type' in child) {
      if (child.type === 'text') return true;
      if (child.type === 'mdxJsxTextElement' && 'children' in child && Array.isArray(child.children)) {
        return child.children.every((c: unknown) => c && typeof c === 'object' && 'type' in c && c.type === 'text');
      }
    }
    return false;
  });
};

/**
 * Convenience wrapper that extracts text content from an array of children nodes.
 */
const extractTextFromChildren = (children: unknown[]): string => {
  return children
    .map(child => {
      if (child && typeof child === 'object' && 'type' in child) {
        return extractText(child as Parameters<typeof extractText>[0]);
      }
      return '';
    })
    .join('');
};

/**
 * Returns true if any node in the array is block-level (non-phrasing) content.
 */
const hasFlowContent = (nodes: Node[]): boolean => {
  return nodes.some(node => !phrasing(node) && node.type !== 'paragraph');
};

/**
 * Process a Table node: re-parse text-only cell content, then output as
 * a markdown table (phrasing-only) or keep as JSX <Table> (has flow content).
 */
const processTableNode = (
  node: MdxJsxFlowElement | MdxJsxTextElement,
  index: number,
  parent: Parents,
  documentPosition?: Node['position'],
): void => {
  if (node.name !== 'Table' && node.name !== 'table') return;

  const position = documentPosition ?? node.position;
  const { align: alignAttr } = getAttrs<Pick<Table, 'align'>>(node);
  const align = Array.isArray(alignAttr) ? alignAttr : null;

  let tableHasFlowContent = false;

  // Re-parse text-only cells through markdown and detect flow content
  visit(node as Node, isTableCell, (cell: MdxJsxTableCell) => {
    if (!isTextOnly(cell.children as unknown[])) return;

    const textContent = extractTextFromChildren(cell.children as unknown[]);
    if (!textContent.trim()) return;

    // Since now we are using remarkMdx, which can fail and error, we need to
    // gate this behind a try/catch to ensure that malformed syntaxes do not
    // crash the page
    try {
      const parsed = tableNodeProcessor.runSync(tableNodeProcessor.parse(textContent)) as Root;
      if (parsed.children.length > 0) {
        cell.children = parsed.children as MdxJsxTableCell['children'];
        if (hasFlowContent(parsed.children as Node[])) {
          tableHasFlowContent = true;
        }
      }
    } catch {
      // If parsing fails, keep original children
    }
  });

  // mdast's table node always treats the first tableRow as <thead>, so we can't
  // represent a header-less table in mdast without the first body row getting
  // promoted. Keep as JSX instead so remarkRehype renders it correctly
  let hasThead = false;
  visit(node as Node, isMDXElement, (child: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (child.name === 'thead') hasThead = true;
  });

  if (tableHasFlowContent || !hasThead) {
    // remarkMdx wraps inline elements in paragraph nodes (e.g. <td> on the
    // same line as content becomes mdxJsxTextElement inside a paragraph).
    // Unwrap these so <td>/<th> sit directly under <tr>, and strip
    // whitespace-only text nodes to avoid rendering empty <p>/<br>.
    const cleanChildren = (children: Node[]): Node[] =>
      children
        .flatMap(child => {
          if (child.type === 'paragraph' && 'children' in child && Array.isArray(child.children)) {
            return child.children as Node[];
          }
          return [child];
        })
        .filter(
          child =>
            !(child.type === 'text' && 'value' in child && typeof child.value === 'string' && !child.value.trim()),
        );

    visit(node as Node, isMDXElement, (el: MdxJsxFlowElement | MdxJsxTextElement) => {
      if ('children' in el && Array.isArray(el.children)) {
        el.children = cleanChildren(el.children as Node[]) as typeof el.children;
      }
    });

    (parent.children as ((typeof parent.children)[number] | MdxJsxFlowElement | MdxJsxTextElement)[])[index] = {
      ...node,
      position,
    };
    return;
  }

  // All cells are phrasing-only — convert to markdown table
  const children: TableRow[] = [];

  // Collect `<td>`/`<th>` cells under any container (a `<tr>`, or a section
  // when cells are bare).
  const collectCells = (container: Node): TableCell[] => {
    const cells: TableCell[] = [];
    visit(container, isTableCell, ({ name, children: cellChildren, position: cellPosition }: MdxJsxTableCell) => {
      cells.push({
        type: tableTypes[name],
        children: unwrapSoleParagraph(cellChildren as Node[]),
        position: cellPosition,
      } as TableCell);
    });
    return cells;
  };

  visit(node as Node, isMDXElement, (child: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (child.name !== 'thead' && child.name !== 'tbody') return;

    const sectionChildren = child.children as Node[];
    const hasRow = sectionChildren.some(
      c => isMDXElement(c) && (c as MdxJsxFlowElement | MdxJsxTextElement).name === 'tr',
    );

    if (hasRow) {
      visit(child as Node, isMDXElement, (row: MdxJsxFlowElement | MdxJsxTextElement) => {
        if (row.name !== 'tr') return;
        children.push({
          type: 'tableRow' as const,
          children: collectCells(row as Node),
          position: row.position,
        });
      });
    } else {
      // No explicit `<tr>`, treat the section as a single implicit row so
      // bare `<th>`s in a `<thead>` (or bare `<td>`s in a `<tbody>`) still
      // produce a row instead of disappearing.
      const cells = collectCells(child as Node);
      if (cells.length > 0) {
        children.push({
          type: 'tableRow' as const,
          children: cells,
          position: child.position,
        });
      }
    }
  });

  const firstRow = children[0];
  const columnCount = firstRow?.children?.length || 0;
  const alignArray: Table['align'][number][] =
    align && columnCount > 0
      ? align.slice(0, columnCount).concat(new Array(Math.max(0, columnCount - align.length)).fill(null))
      : new Array(columnCount).fill(null);

  const mdNode: Table = {
    align: alignArray,
    type: 'table',
    position,
    children,
  };

  parent.children[index] = mdNode;
};

/**
 * Converts JSX Table elements to markdown table nodes and re-parses markdown in cells.
 *
 * The jsxTable micromark tokenizer captures `<Table>...</Table>` as a single html node,
 * preventing CommonMark HTML block type 6 from fragmenting it at blank lines. This
 * transformer then re-parses the html node with remarkMdx to produce proper JSX AST nodes
 * and converts them to MDAST table/tableRow/tableCell nodes.
 *
 * When cell content contains block-level nodes (callouts, code blocks, etc.), the table
 * is kept as a JSX <Table> element so that remarkRehype can properly handle the flow content.
 */
const mdxishTables = (): Transform => tree => {
  visit(tree, 'html', (_node, index, parent) => {
    const node = _node as Html;
    if (typeof index !== 'number' || !parent || !('children' in parent)) return;
    if (!node.value.startsWith('<Table') && !node.value.startsWith('<table')) return;

    try {
      const parsed = tableNodeProcessor.runSync(tableNodeProcessor.parse(node.value)) as Root;

      // since we use a subparser in `tableNodeProcessor` to parse `node.value`,
      // positions are relative to that substring. shifting them by the base
      // offset and line number makes them valid in the outer source coordinate space.
      // otherwise, consumers who directly slice based on position would read and grab the
      // wrong content
      const baseOffset = node.position?.start?.offset ?? 0;
      const baseLine = (node.position?.start?.line ?? 1) - 1;
      visit(parsed as Node, child => {
        if (child.position?.start) {
          child.position.start.offset = (child.position.start.offset ?? 0) + baseOffset;
          child.position.start.line += baseLine;
        }
        if (child.position?.end) {
          child.position.end.offset = (child.position.end.offset ?? 0) + baseOffset;
          child.position.end.line += baseLine;
        }
      });

      visit(parsed as Node, isMDXElement, (tableNode: MdxJsxFlowElement | MdxJsxTextElement) => {
        if (tableNode.name !== 'Table' && tableNode.name !== 'table') return undefined;

        processTableNode(tableNode, index, parent as Parents, node.position);
        return EXIT;
      });
    } catch {
      // If parsing fails, leave the node as-is
    }
  });

  return tree;
};

export default mdxishTables;
