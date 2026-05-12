import type { Html, Node, Parents, Root, Table, TableCell, TableRow } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';

import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import htmlTags from 'html-tags';
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

// `mdxjs` + `mdxFromMarkdown` is what `remarkMdx` registers internally; we
// register them manually so we control ordering against our other tokenizers.
// The fallback omits these so blank-line-separated markdown inside cells still
// parses when mdxjs throws on malformed JSX.
const buildTableNodeProcessor = (withMdx: boolean) =>
  unified()
    .data('micromarkExtensions', [...(withMdx ? [mdxjs()] : []), gemoji(), legacyVariable()])
    .data('fromMarkdownExtensions', [
      ...(withMdx ? [mdxFromMarkdown()] : []),
      gemojiFromMarkdown(),
      legacyVariableFromMarkdown(),
    ])
    .use(remarkParse)
    .use(normalizeEmphasisAST)
    .use([[calloutTransformer, { isMdxish: true }], codeTabsTransformer])
    .use(remarkGfm);

const tableNodeProcessor = buildTableNodeProcessor(true);
const fallbackTableNodeProcessor = buildTableNodeProcessor(false);

// Since we use a subparser in `tableNodeProcessor` to parse `node.value`,
// positions are relative to that substring. Shifting them by the base
// offset and line number makes them valid in the outer source coordinate space.
// Otherwise, consumers who directly slice based on position would read and grab the
// wrong content
const parseTableNode = (processor: typeof tableNodeProcessor, node: Html): Root | undefined => {
  let parsed: Root;
  try {
    parsed = processor.runSync(processor.parse(node.value)) as Root;
  } catch {
    return undefined;
  }

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
  return parsed;
};

/**
 * Check if children are only text nodes that might contain markdown
 */
const isTextOnly = (children: unknown[]): boolean => {
  return children.every(child => {
    if (child && typeof child === 'object' && 'type' in child) {
      if (child.type === 'text') return true;
      // An empty mdxJsxTextElement is a self-closing inline element like
      // `<br />` or `<img />` — it isn't text, and treating it as such would
      // cause `extractTextFromChildren` to drop it during the cell re-parse.
      if (child.type === 'mdxJsxTextElement' && 'children' in child && Array.isArray(child.children)) {
        return (
          child.children.length > 0 &&
          child.children.every((c: unknown) => c && typeof c === 'object' && 'type' in c && c.type === 'text')
        );
      }
    }
    return false;
  });
};

// Run a captured `<Table>...</Table>` source string through the HTML5 parser
// and re-serialize. The parser auto-closes void elements (`<br>` → `<br />`),
// repairs unclosed non-void tags per the HTML5 algorithm, and preserves
// already-matched pairs by construction — producing markup that remarkMdx
// can parse. Uppercase JSX components (`<Image />`, `<Foo>...</Foo>`) are
// masked with text placeholders before parsing so the HTML parser doesn't
// lowercase their names.
const JSX_PLACEHOLDER_RE = /__MDXISH_JSX_(\d+)__/g;

// Mask uppercase JSX components other than the outer `<Table>` wrapper. The
// HTML parser must still see `<Table>...</Table>` (it lowercases it to
// `<table>` and parses the table structure normally), but inner components
// like `<Image src="x" />` or `<Foo>...</Foo>` would have their casing
// destroyed — so we swap them for opaque text placeholders and restore
// after re-serialization.
const maskUppercaseJsx = (source: string): { jsx: string[]; masked: string } => {
  const jsx: string[] = [];
  const masked = source
    .replace(/<(?!Table\b)[A-Z][A-Za-z0-9.]*\b[^>]*\/>/g, m => {
      const id = jsx.length;
      jsx.push(m);
      return `__MDXISH_JSX_${id}__`;
    })
    .replace(/<(?!Table\b)([A-Z][A-Za-z0-9.]*)\b[^>]*>[\s\S]*?<\/\1\s*>/g, m => {
      const id = jsx.length;
      jsx.push(m);
      return `__MDXISH_JSX_${id}__`;
    });
  return { jsx, masked };
};

const VALID_HTML_TAGS = new Set<string>(htmlTags);

// Escape `<unknownTag>` / `</unknownTag>` so the HTML parser treats them as
// literal text instead of opening a generic element. Required because MDX
// rejects unclosed/balanced-but-line-split pseudo-tags like `<string>` even
// when an HTML parser would happily auto-close them — escaping renders the
// author's `Array <string>` intent as visible text.
const ESCAPE_UNKNOWN_TAG_RE = /<\/?([a-z][a-zA-Z0-9-]*)(?:\s[^>]*|\s*\/?)>/g;

const escapeUnknownTags = (source: string): string =>
  source.replace(ESCAPE_UNKNOWN_TAG_RE, (m, tagName) =>
    VALID_HTML_TAGS.has(tagName) ? m : m.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  );

// Mask `={expression}` JSX attribute values so parse5 doesn't HTML-encode
// the braces/quotes inside them. Restored verbatim after re-serialization.
const EXPR_PLACEHOLDER_RE = /__MDXISH_EXPR_(\d+)__/g;

const maskJsxExpressionAttributes = (source: string): { expressions: string[]; masked: string } => {
  const expressions: string[] = [];
  const masked = source.replace(/=\{(?:[^{}]|\{[^{}]*\})*\}/g, m => {
    const id = expressions.length;
    expressions.push(m);
    return `="__MDXISH_EXPR_${id}__"`;
  });
  return { expressions, masked };
};

const repairTableSourceHtml = (source: string): string => {
  const { expressions, masked: noExpr } = maskJsxExpressionAttributes(source);
  const { jsx, masked: noJsx } = maskUppercaseJsx(noExpr);
  const escaped = escapeUnknownTags(noJsx);
  const fragment = fromHtml(escaped, { fragment: true });
  const serialized = toHtml(fragment, {
    allowDangerousCharacters: true,
    allowDangerousHtml: true,
    closeEmptyElements: true,
    closeSelfClosing: true,
  });
  // Each masked attribute was stored as the full `={expr}` slice, so swap
  // the synthetic `="placeholder"` form (including its quotes) back to the
  // original — anything else would double the `=`.
  return serialized
    .replace(/="__MDXISH_EXPR_(\d+)__"/g, (_, id) => expressions[Number(id)])
    .replace(EXPR_PLACEHOLDER_RE, (_, id) => expressions[Number(id)])
    .replace(JSX_PLACEHOLDER_RE, (_, id) => jsx[Number(id)]);
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

  // remarkMdx wraps inline `<tr>`s in a paragraph; unwrap one level so the
  // hasRow check below sees them.
  const flattenSectionChildren = (nodes: Node[]): Node[] =>
    nodes.flatMap(n =>
      n.type === 'paragraph' && 'children' in n && Array.isArray(n.children) ? (n.children as Node[]) : [n],
    );

  visit(node as Node, isMDXElement, (child: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (child.name !== 'thead' && child.name !== 'tbody') return;

    const sectionChildren = flattenSectionChildren(child.children as Node[]);
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
      // No `<tr>`, chunk bare cells into rows using the prior row's column
      // count (e.g. from `<thead>`), so 4 bare `<td>`s under a 2-col header
      // become 2 rows of 2.
      const cells = collectCells(child as Node);
      if (cells.length === 0) return;
      const cols = children[0]?.children?.length || cells.length;
      for (let i = 0; i < cells.length; i += cols) {
        children.push({
          type: 'tableRow' as const,
          children: cells.slice(i, i + cols),
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

    const parsed = parseTableNode(tableNodeProcessor, node);
    if (parsed) {
      visit(parsed as Node, isMDXElement, (tableNode: MdxJsxFlowElement | MdxJsxTextElement) => {
        if (tableNode.name !== 'Table' && tableNode.name !== 'table') return undefined;

        processTableNode(tableNode, index, parent as Parents, node.position);
        return EXIT;
      });
      return;
    }

    // MDX parse failed — usually because a cell contains raw HTML the JSX
    // parser rejects (`<br>`, `<img src="x">`, `<p>hi`, `Array <div`). Run
    // the captured source through the HTML5 parser to repair unclosed/void
    // tags, then retry under MDX before falling back to the non-MDX path.
    const repaired = repairTableSourceHtml(node.value);
    if (repaired !== node.value) {
      const retried = parseTableNode(tableNodeProcessor, { ...node, value: repaired });
      if (retried) {
        visit(retried as Node, isMDXElement, (tableNode: MdxJsxFlowElement | MdxJsxTextElement) => {
          if (tableNode.name !== 'Table' && tableNode.name !== 'table') return undefined;

          processTableNode(tableNode, index, parent as Parents, node.position);
          return EXIT;
        });
        return;
      }
    }

    // Repair didn't help — re-parse without MDX so markdown between `<td>`
    // and `</td>` still renders; tags stay as raw HTML.
    const fallback = parseTableNode(fallbackTableNodeProcessor, node);
    if (!fallback || fallback.children.length <= 1) return;
    parent.children.splice(index, 1, ...(fallback.children as typeof parent.children));
  });

  return tree;
};

export default mdxishTables;
