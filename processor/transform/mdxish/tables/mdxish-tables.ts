import type { Html, Node, Parent, Root, Table, TableCell, TableRow } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { Plugin } from 'unified';

import { mdxFromMarkdown } from 'mdast-util-mdx';
import { phrasing } from 'mdast-util-phrasing';
import { mdxjs } from 'micromark-extension-mdxjs';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { EXIT, visit } from 'unist-util-visit';
import { visitParents } from 'unist-util-visit-parents';

import { NodeTypes } from '../../../../enums';
import { mdxishExpressionFromMarkdown } from '../../../../lib/mdast-util/mdx-expression';
import { FEATURES, mdxishExtensions } from '../../../../lib/micromark/mdxish-extensions';
import { createValueToSourceMapper, getAttrs, isMDXElement } from '../../../utils';
import calloutTransformer from '../../callouts';
import codeTabsTransformer from '../../code-tabs';
import { extractText } from '../../extract-text';
import normalizeEmphasisAST from '../normalize-malformed-md-syntax';
import { replaceInheritingReparseSource, resolveReparseSource, stampReparseSource } from '../reparse-source';

import { escapeCrossingEmphasis } from './escape-crossing-emphasis';
import { escapeStrayLessThan } from './escape-stray-less-than';
import { normalizeTagSpacing } from './normalize-tag-spacing';
import { remapPositionsThroughLayers } from './remap-positions';
import { repairExpressionEscapes } from './repair-expression-escapes';
import { repairUnclosedTags } from './repair-unclosed-tags';
import { splitHtmlWithNestedTables } from './split-nested-tables';
import { tableTags, unwrapParagraphNodes, unwrapSoleParagraph, type Insert, type RepairResult } from './utils';

interface MdxJsxTableCell extends Omit<MdxJsxFlowElement, 'name'> {
  name: 'td' | 'th';
}

const isTableCell = (node: Node): node is MdxJsxTableCell => isMDXElement(node) && ['th', 'td'].includes(node.name);

const tableTypes = {
  tr: 'tableRow',
  th: 'tableCell',
  td: 'tableCell',
};

// `mdxjs` + `mdxFromMarkdown` is what `remarkMdx` registers internally; we
// register them manually so we control ordering against our other tokenizers.
// The fallback omits these so blank-line-separated markdown inside cells still
// parses when mdxjs throws on malformed JSX. Both paths end up with indented
// code disabled — the base config on the fallback, `mdx-md` on the primary.
//
// mdx parsing is used because it heavily simplifies the parsing of the table structure;
// it can identify the rows and cells. The heavy lifting is done by it
const buildTableNodeProcessor = (withMdx: boolean) => {
  const { micromarkExtensions, fromMarkdownExtensions } = mdxishExtensions(FEATURES.tableCell);

  // `mdxjs` goes first (= lowest priority): its `mdxJsx` also claims `text` + `<`,
  // and `legacyVariable` has to keep winning that race so `<<var>>` still parses.
  // `mdxishExpressionFromMarkdown` follows `mdxFromMarkdown` to override its expression exit.
  return unified()
    .data('micromarkExtensions', [...(withMdx ? [mdxjs()] : []), ...micromarkExtensions])
    .data('fromMarkdownExtensions', [
      ...(withMdx ? [mdxFromMarkdown(), mdxishExpressionFromMarkdown()] : []),
      ...fromMarkdownExtensions,
    ])
    .use(remarkParse)
    .use(normalizeEmphasisAST)
    .use([[calloutTransformer, { isMdxish: true }], codeTabsTransformer])
    .use(remarkGfm);
};

const tableNodeProcessor = buildTableNodeProcessor(true);
const fallbackTableNodeProcessor = buildTableNodeProcessor(false);

// Targeted repairs for tables mdxjs rejects, tried cumulatively (each runs on
// the prior's output) since one table can carry independent per-cell defects.
// Each was added after seeing real customer content fail to parse:
//  - repairUnclosedTags:      unclosed/orphan HTML tags
//  - normalizeTagSpacing:     a line mixing text and an opening tag
//  - repairExpressionEscapes: backslash escapes inside a `{…}` expression
//  - escapeStrayLessThan:     a `<` that doesn't begin a valid tag (`word <`)
//  - escapeCrossingEmphasis:  emphasis opening/closing at different tag depths
const tableRepairs: ((html: string) => RepairResult)[] = [
  repairUnclosedTags,
  normalizeTagSpacing,
  repairExpressionEscapes,
  escapeStrayLessThan,
  escapeCrossingEmphasis,
];

/**
 * Parse the HTML node that contains the full table substring
 * into the table parts (headers, rows, cells).
 * The plugins in the processor allows parsing markdown & special syntax inside the table cells
 * After parsing, we need to update the node positions
 */
const parseTableNode = (
  processor: typeof tableNodeProcessor,
  node: Html,
  source: string | undefined,
  repair?: { layers: Insert[][]; originalSource: string },
): Root | undefined => {
  let parsed: Root;
  try {
    parsed = processor.runSync(processor.parse(node.value)) as Root;
  } catch {
    return undefined;
  }

  // If `node.value` was repaired before parsing, first remap positions back to
  // the original (unrepaired) coordinates via the insert layers — otherwise the
  // shift would land on synthetic characters and be inaccurate
  if (repair) {
    remapPositionsThroughLayers(parsed as Node, repair.originalSource, repair.layers);
  }

  // The subparser produces positions relative to `node.value`; map them into
  // the outer source so consumers can slice it.
  const toSourcePoint = createValueToSourceMapper(node.position, repair?.originalSource ?? node.value, source);
  if (!toSourcePoint) return parsed;
  visit(parsed as Node, child => {
    if (!child.position) return;
    child.position = {
      start: toSourcePoint(child.position.start.offset ?? 0),
      end: toSourcePoint(child.position.end.offset ?? 0),
    };
  });
  return parsed;
};

/**
 * Check if children are only text nodes that might contain markdown
 */
const isTextOnly = (children: unknown[]): boolean => {
  return children.every(child => child && typeof child === 'object' && 'type' in child && child.type === 'text');
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
 * Process a Table node: re-parse text-only cell content, then return it as
 * a markdown table (phrasing-only) or keep it as JSX <Table> (has flow content).
 */
const processTableNode = (
  node: MdxJsxFlowElement | MdxJsxTextElement,
  documentPosition?: Node['position'],
): MdxJsxFlowElement | MdxJsxTextElement | Table => {
  const position = documentPosition ?? node.position;
  const { align: alignAttr } = getAttrs<Pick<Table, 'align'>>(node);
  const align = Array.isArray(alignAttr) ? alignAttr : null;

  let tableHasFlowContent = false;

  // An `<HTMLBlock>` (still a JSX element here; converted to `html-block` by
  // `mdxishHtmlBlocks` after this transformer) is block-level content that a
  // markdown table cell can't represent, so keep the table as a JSX `<Table>`.
  visit(
    node as Node,
    candidate =>
      candidate.type === NodeTypes.htmlBlock ||
      ((candidate.type === 'mdxJsxFlowElement' || candidate.type === 'mdxJsxTextElement') &&
        (candidate as MdxJsxFlowElement | MdxJsxTextElement).name === 'HTMLBlock'),
    () => {
      tableHasFlowContent = true;
      return EXIT;
    },
  );

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
        // Positions index into the extracted text rather than the table source (CX-4004).
        stampReparseSource(parsed.children, textContent);
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
  // mdast table/tableRow/tableCell does not represent HTML attributes (class, style, etc).
  // If any structural table HTML child carries attributes, keep the table as JSX so their attributes
  // are preserved through to the rendered output.
  let hasStructuralAttributes = false;
  visit(node as Node, isMDXElement, (child: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (child.name === 'thead') hasThead = true;
    if (tableTags.has(child.name) && Array.isArray(child.attributes) && child.attributes.length > 0) {
      hasStructuralAttributes = true;
    }
  });

  if (tableHasFlowContent || !hasThead || hasStructuralAttributes) {
    // remarkMdx wraps inline elements in paragraph nodes (e.g. <td> on the
    // same line as content becomes mdxJsxTextElement inside a paragraph).
    // Unwrap these so <td>/<th> sit directly under <tr>, and strip
    // whitespace-only text nodes to avoid rendering empty <p>/<br>.
    const removeWhitespaceOnlyTextNodes = (children: Node[]): Node[] =>
      children.filter(
        child => !(child.type === 'text' && 'value' in child && typeof child.value === 'string' && !child.value.trim()),
      );

    visit(node as Node, isMDXElement, (el: MdxJsxFlowElement | MdxJsxTextElement) => {
      if (!('children' in el) || !Array.isArray(el.children)) return;

      // Filtering transformers
      // A cell only unwraps a sole paragraph: multiple paragraphs are real
      // blank-line-separated content that must stay separated
      const unwrapped = isTableCell(el)
        ? unwrapSoleParagraph(el.children as Node[])
        : unwrapParagraphNodes(el.children as Node[]);
      el.children = removeWhitespaceOnlyTextNodes(unwrapped) as typeof el.children;
    });

    return { ...node, position };
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

  // remarkMdx wraps inline `<tr>`s in a paragraph; unwrap one level so the
  // hasRow check below sees them.
  const flattenSectionChildren = (nodes: Node[]): Node[] =>
    nodes.flatMap(n =>
      n.type === 'paragraph' && 'children' in n && Array.isArray(n.children) ? (n.children as Node[]) : [n],
    );

  // Iterate the table's direct children in document order. Rows may live
  // inside a `<thead>`/`<tbody>` section, or sit bare directly under the table
  // with no section wrapper — both are collected here so the first row becomes
  // the markdown table header.
  const tableChildren = flattenSectionChildren(node.children as Node[]);
  tableChildren.forEach(child => {
    if (!isMDXElement(child)) return;
    const childElement = child as MdxJsxFlowElement | MdxJsxTextElement;

    // Path for a `<tr>` directly under the table, without a `<thead>`/`<tbody>` wrapper.
    if (childElement.name === 'tr') {
      children.push({
        type: 'tableRow' as const,
        children: collectCells(childElement as Node),
        position: childElement.position,
      });
      return;
    }

    // Path for when the rows are wrapped in a `<thead>`/`<tbody>`
    // We visit & collect the entire rows under them directly here
    if (childElement.name !== 'thead' && childElement.name !== 'tbody') return;

    const sectionChildren = flattenSectionChildren(childElement.children as Node[]);
    const hasRow = sectionChildren.some(
      c => isMDXElement(c) && (c as MdxJsxFlowElement | MdxJsxTextElement).name === 'tr',
    );

    if (hasRow) {
      visit(childElement as Node, isMDXElement, (row: MdxJsxFlowElement | MdxJsxTextElement) => {
        if (row.name !== 'tr') return;
        children.push({
          type: 'tableRow' as const,
          children: collectCells(row as Node),
          position: row.position,
        });
      });
    } else {
      // No `<tr>`, chunk bare cells into rows using the prior row's column
      // count (e.g. from `<thead>`), so 4 bare `<td>`s under a 2-col header
      // become 2 rows of 2.
      const cells = collectCells(childElement as Node);
      if (cells.length === 0) return;
      const cols = children[0]?.children?.length || cells.length;
      for (let i = 0; i < cells.length; i += cols) {
        children.push({
          type: 'tableRow' as const,
          children: cells.slice(i, i + cols),
          position: childElement.position,
        });
      }
    }
  });

  // Output the markdown table node
  const firstRow = children[0];
  const columnCount = firstRow?.children?.length || 0;
  const alignArray: Table['align'][number][] =
    align && columnCount > 0
      ? align.slice(0, columnCount).concat(new Array(Math.max(0, columnCount - align.length)).fill(null))
      : new Array(columnCount).fill(null);

  return {
    align: alignArray,
    type: 'table',
    position,
    children,
    // Remember the author's spelling so the serializer can write `<table>` back instead of `<Table>`
    ...(node.name === 'table' && { data: { lowercaseTable: true } }),
  };
};

/**
 * Apply `tableRepairs` cumulatively, re-parsing after every change and stopping
 * once the accumulated result parses. Each layer's inserts are relative to the
 * string that repair received, so they stay ordered for position remapping.
 */
const repairAndReparse = (node: Html, source: string | undefined): Root | undefined => {
  let repairedValue = node.value;
  const layers: Insert[][] = [];
  let parsed: Root | undefined;

  tableRepairs.some(repair => {
    const { value, inserts } = repair(repairedValue);
    if (value === repairedValue) return false;
    repairedValue = value;
    layers.push(inserts);
    parsed = parseTableNode(tableNodeProcessor, { ...node, value: repairedValue }, source, {
      layers,
      originalSource: node.value,
    });
    return Boolean(parsed);
  });

  return parsed;
};

/**
 * Re-parse a table html node and replace it with a markdown / JSX table, or the
 * fallback parse's fragments for a lowercase table mdxjs rejects.
 */
const replaceTableHtml = (node: Html, index: number, parent: Parent, source: string | undefined) => {
  // Because the processor uses remarkMdx, it is stricter in what it accepts
  // and only accepts valid MDX syntax in the table node. To get around that,
  // fall back to the cumulative repairs when the first parse fails.
  const parsed = parseTableNode(tableNodeProcessor, node, source) ?? repairAndReparse(node, source);

  if (parsed) {
    // If the table is parsed successfully, we can now process it further
    // to build on the markdown / JSX table
    visit(parsed as Node, isMDXElement, (tableNode: MdxJsxFlowElement | MdxJsxTextElement) => {
      if (tableNode.name !== 'Table' && tableNode.name !== 'table') return undefined;
      replaceInheritingReparseSource(parent, index, [processTableNode(tableNode, node.position)]);
      return EXIT;
    });
  } else if (node.value.startsWith('<table')) {
    // If the parsing still fails, give an opportunity to the fallback parser
    // without remarkMdx to process lowercase tables as it's likely to not
    // have needed MDX parsing anyway
    const fallback = parseTableNode(fallbackTableNodeProcessor, node, source);
    if (!fallback || fallback.children.length <= 1) return;
    replaceInheritingReparseSource(parent, index, fallback.children);
  }
  // Otherwise, there's no point in trying to parse the table content further
  // More repairs are needed in that case
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
const mdxishTables: Plugin<[], Root> = () => (tree, file) => {
  // Positions index into the document unless a re-parse stamped another source.
  const documentSource = file?.value ? String(file.value) : undefined;

  // Pre-pass: lift `<table>`s wrapped in a raw HTML block out into their own
  // html nodes so the main pass below treats them like top-level tables.
  visitParents(tree, 'html', (node: Html, ancestors: Parent[]) => {
    const parent = ancestors[ancestors.length - 1];
    if (!parent) return;
    const parts = splitHtmlWithNestedTables(node, resolveReparseSource(node, ancestors, documentSource));
    if (!parts) return;
    // The inserted parts can't re-trigger a split (table parts start with
    // `<table`; the wrapper slices hold no table), so plain in-place splicing
    // visits each once without looping.
    replaceInheritingReparseSource(parent, parent.children.indexOf(node), parts);
  });

  visitParents(tree, 'html', (node: Html, ancestors: Parent[]) => {
    const parent = ancestors[ancestors.length - 1];
    if (!parent) return;
    if (!node.value.startsWith('<Table') && !node.value.startsWith('<table')) return;

    // Inline tables are tokenized as separate raw HTML fragments inside a
    // paragraph. Leave them untouched so rehype-raw can reassemble the table.
    if (parent.type === 'paragraph') return;

    replaceTableHtml(
      node,
      parent.children.indexOf(node),
      parent,
      resolveReparseSource(node, ancestors, documentSource),
    );
  });
};

export default mdxishTables;
