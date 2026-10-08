import type { MdxishOpts } from './mdxish';
import type { Element, Root as HastRoot } from 'hast';
import type { Heading, Nodes, Parent, Root as MdastRoot, Text } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx-expression';

import { EXIT, visit } from 'unist-util-visit';
import { visitParents } from 'unist-util-visit-parents';
import { VFile } from 'vfile';

import { createTextNode, isMDXElement } from '../processor/utils';

import { mdxishRenderProcessor } from './mdxish';
import { jsxAcornParser } from './utils/jsx-acorn-parser';
import { evaluateLiteralExpression } from './utils/literal-expression';

const HEADING_INDEX = 'dataMdxishHeadingIndex';
const HEADING_TAG_REGEX = /^h[1-6]$/;
const JSX_COMMENT_REGEX = /^\s*\/\*[\s\S]*\*\/\s*$/;

type Expression = MdxFlowExpression | MdxTextExpression;

interface ExpressionEdit {
  heading: Heading | undefined;
  node: Expression;
  parent: Parent;
  replacement: Text | null;
}

interface EstreeNode {
  computed?: boolean;
  object?: EstreeNode;
  type: string;
}

const isExpression = (node: Nodes): node is Expression =>
  node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression';

function collectHeadings(tree: MdastRoot): Heading[] {
  const headings: Heading[] = [];
  visit(tree, 'heading', (node: Heading) => {
    headings.push(node);
  });
  return headings;
}

function literalValue(source: string): { value: unknown } | null {
  try {
    return { value: evaluateLiteralExpression(source) };
  } catch {
    return null;
  }
}

function trimHeadingText(heading: Heading) {
  const first = heading.children[0];
  if (first?.type === 'text') first.value = first.value.trimStart();
  const last = heading.children.at(-1);
  if (last?.type === 'text') last.value = last.value.trimEnd();
}

const isNamePath = (node: EstreeNode): boolean =>
  node.type === 'Identifier' ||
  (node.type === 'MemberExpression' && !node.computed && !!node.object && isNamePath(node.object));

// A name like `{price}` or `{plan.name}` can only read a value, never build an element. Code the parser
// rejects can't run at all, so the hub shows it as text.
function canBuildElements(source: string): boolean {
  try {
    return !isNamePath(jsxAcornParser.parseExpressionAt(source, 0, { ecmaVersion: 'latest' }) as EstreeNode);
  } catch {
    return false;
  }
}

// An expression the hub has to run changes a heading from inside one, by building an element (a call or JSX),
// or as a block: alone in its paragraph, its result is lifted out as one.
function canChangeHeadings(node: Expression, parent: Parent, heading: Heading | undefined): boolean {
  if (heading || node.type === 'mdxFlowExpression' || canBuildElements(node.value)) return true;
  return parent.children.every(child => child === node || (child.type === 'text' && !child.value.trim()));
}

// Safe mode leaves `<h2 id={...}>` without the id the hub evaluates, which shifts the numbering.
function hasEvaluatedHeadingAttribute(tree: MdastRoot): boolean {
  let found = false;
  visit(tree, isMDXElement, (node: MdxJsxFlowElement | MdxJsxTextElement) => {
    if (!HEADING_TAG_REGEX.test(node.name ?? '')) return undefined;
    found = node.attributes.some(
      attribute => attribute.type === 'mdxJsxExpressionAttribute' || typeof attribute.value === 'object',
    );
    return found ? EXIT : undefined;
  });
  return found;
}

// Matches what the hub renders without running code: comments are stripped and plain literals become their
// text. `false` when an expression that needs running could change the headings.
function settleExpressions(tree: MdastRoot): boolean {
  const edits: ExpressionEdit[] = [];
  let settled = true;

  visitParents(tree, isExpression, (node: Expression, ancestors: Parent[]) => {
    const heading = ancestors.find((ancestor): ancestor is Heading => ancestor.type === 'heading');
    const parent = ancestors[ancestors.length - 1];
    if (JSX_COMMENT_REGEX.test(node.value)) {
      edits.push({ heading, node, parent, replacement: null });
      return;
    }
    const literal = literalValue(node.value);
    if (literal) {
      edits.push({ heading, node, parent, replacement: createTextNode(literal.value, node.position) });
      return;
    }
    if (canChangeHeadings(node, parent, heading)) settled = false;
  });

  const apply = ({ node, parent, replacement }: ExpressionEdit) => {
    (parent.children as Nodes[]).splice(
      parent.children.indexOf(node as never),
      1,
      ...(replacement ? [replacement] : []),
    );
  };
  // Comments go first: the hub strips them from the source, so the parser trims only the source
  // whitespace around them, never the spaces a literal adds.
  edits
    .filter(edit => !edit.replacement)
    .forEach(edit => {
      apply(edit);
      if (edit.heading) trimHeadingText(edit.heading);
    });
  edits.filter(edit => edit.replacement).forEach(apply);
  return settled;
}

/** Each heading's rendered anchor id, worked out without running code; `null` when code could change them. */
export function mdxishHeadingIds(
  tree: MdastRoot,
  opts: Omit<MdxishOpts, 'safeMode'> = {},
): Map<Heading, string> | null {
  const headings = collectHeadings(tree);
  if (headings.length === 0) return new Map();

  const copy = structuredClone(tree);
  let hasExport = false;
  visit(copy, 'mdxjsEsm', () => {
    hasExport = true;
  });
  // An `export` can define components that render headings.
  if (hasExport || hasEvaluatedHeadingAttribute(copy) || !settleExpressions(copy)) return null;

  collectHeadings(copy).forEach((heading, index) => {
    heading.data = { ...heading.data, hProperties: { ...heading.data?.hProperties, [HEADING_INDEX]: index } };
  });
  const file = new VFile();
  file.data.explicitHeadingIds = new Set(
    headings.flatMap(heading =>
      typeof heading.data?.hProperties?.id === 'string' ? [heading.data.hProperties.id] : [],
    ),
  );
  const hast = mdxishRenderProcessor({ ...opts, safeMode: true }).runSync(copy, file) as HastRoot;

  const ids = new Map<Heading, string>();
  visit(hast, 'element', (node: Element) => {
    const index = node.properties[HEADING_INDEX];
    if (index === undefined || typeof node.properties.id !== 'string') return;
    ids.set(headings[Number(index)], node.properties.id);
  });
  return ids;
}
