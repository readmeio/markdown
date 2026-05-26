/**
 * Structural HTML diff for MDX-vs-MDXish render comparison.
 *
 * Algorithm overview:
 *   parseDocument(html, { xmlMode: true }) → walk → canonical {tag, attrs, children} tree
 *   apply canonicalization pipeline (sort/normalize/collapse)
 *   compute bottom-up content hash
 *   fast-path match if hashes equal
 *   otherwise, recursive walk emitting Change records
 *
 * Tree-walk targets the htmlparser2 / domhandler node shape. The canonicalization
 * rules and severity model are transplanted verbatim from the reference differ.ts
 * (PR #18479 in the readme repo). The tree-walk is re-targeted to htmlparser2/domhandler.
 *
 * The lint disables below are intentional and scoped to this file:
 * - `no-restricted-syntax` + `no-continue`: this is a tree-walker with greedy
 *   alignment and lookahead; for-of with continue is the natural shape and
 *   array iteration helpers would obscure the control flow.
 * - `@typescript-eslint/no-use-before-define`: helpers are ordered bottom-up
 *   (primitives first, public `diff()` last) so the public API anchors the
 *   end of the file.
 */
/* eslint-disable no-restricted-syntax, no-continue, @typescript-eslint/no-use-before-define */
import type { Change, DiffOptions, DiffResult, Severity } from './types';
import type { AnyNode, ChildNode, Element, Text } from 'domhandler';

import { createHash } from 'node:crypto';

// eslint-disable-next-line import/no-extraneous-dependencies -- transitive via htmlparser2
import { ElementType, isTag } from 'domelementtype';
import { parseDocument } from 'htmlparser2';


/* ---------- internal canonical node types ---------- */

interface ElementNode {
  attrs: Record<string, string>;
  children: CanonNode[];
  hash: string;
  tag: string;
  type: 'element';
}

interface TextNode {
  hash: string;
  type: 'text';
  value: string;
}

type CanonNode = ElementNode | TextNode;

/* ---------- constant sets ---------- */

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const NOISE_ATTRS = new Set(['data-reactroot', 'data-testid', 'suppresshydrationwarning']);

const CONTENT_ATTRS = new Set(['href', 'src', 'id', 'value', 'alt', 'title']);

/* ---------- canonicalization ---------- */

function hashText(value: string): string {
  return createHash('sha1').update(`t:${value}`).digest('hex');
}

function hashElement(tag: string, attrs: Record<string, string>, children: CanonNode[]): string {
  const sortedAttrKeys = Object.keys(attrs).sort();
  const attrStr = sortedAttrKeys.map(k => `${k}=${attrs[k]}`).join('|');
  const childStr = children.map(c => c.hash).join(',');
  return createHash('sha1').update(`e:${tag}|${attrStr}|${childStr}`).digest('hex');
}

function walkAndCanonicalize(node: AnyNode, opts: DiffOptions, isRoot: boolean): CanonNode {
  // Text node
  if (node.type === ElementType.Text) {
    const collapsed = (node as Text).data.replace(/\s+/g, ' ').trim();
    return { type: 'text', value: collapsed, hash: hashText(collapsed) };
  }

  // Comment, directive (includes <!doctype>) — treat as empty text to drop them out of comparison.
  // Note: in domhandler's AnyNode union, doctypes are represented as ProcessingInstruction
  // nodes with type === ElementType.Directive (not ElementType.Doctype).
  if (node.type === ElementType.Comment || node.type === ElementType.Directive) {
    return { type: 'text', value: '', hash: hashText('') };
  }

  // Root node (Document type = 'root') or element
  const tag = isRoot ? '#root' : (node as Element).name;

  // Attributes: domhandler gives plain Record<string,string> — not a {name,value}[] array
  const rawAttrs: Record<string, string> = isRoot ? {} : ((node as Element).attribs ?? {});
  const attrs: Record<string, string> = {};

  for (const [name, value] of Object.entries(rawAttrs)) {
    // oxlint-disable-next-line no-continue
    if (NOISE_ATTRS.has(name)) continue;
    // oxlint-disable-next-line no-continue
    if (opts.attrIgnore?.has(name)) continue;
    // oxlint-disable-next-line no-continue
    if (name === 'aria-hidden' && value === 'false') continue;

    let normalizedValue = value;

    if (name === 'class') {
      normalizedValue = normalizedValue
        .split(/\s+/)
        .filter(Boolean)
        .sort()
        .join(' ');
      // oxlint-disable-next-line no-continue
      if (!normalizedValue) continue; // drop empty class
    }
    // oxlint-disable-next-line no-continue
    if (name === 'style' && normalizedValue.trim() === '') continue;

    // Heading-slug counter normalization
    if (name === 'id' && /^h[1-6]$/.test(tag) && !opts.preserveHeadingCounters) {
      normalizedValue = normalizedValue.replace(/^(.+)-\d+$/, '$1');
    }

    // Canonicalize whitespace-only non-class/non-style values to '' so that
    // (a) two semantically-equivalent whitespace values (`"  "` vs `"   "`) do
    // not diff as unequal, and (b) they flow into the boolean denormalization
    // below — matching the existing intent that "empty" attributes are
    // equivalent to a boolean-true presence. Class is handled separately
    // above (sort+filter); style short-circuits via the `continue` above.
    if (name !== 'class' && name !== 'style' && normalizedValue.trim() === '') {
      normalizedValue = '';
    }

    // Boolean attribute denormalization: empty → "true"
    if (normalizedValue === '') normalizedValue = 'true';

    attrs[name] = normalizedValue;
  }

  // Children
  const rawChildren: ChildNode[] = isRoot
    ? ((node as unknown as { children: ChildNode[] }).children ?? [])
    : isTag(node as AnyNode)
      ? (node as Element).children ?? []
      : [];

  const children: CanonNode[] = [];
  for (const c of rawChildren) {
    const canon = walkAndCanonicalize(c, opts, false);
    // oxlint-disable-next-line no-continue
    if (canon.type === 'text' && canon.value === '') continue;
    children.push(canon);
  }

  // Void elements never have children; force-empty for stability.
  // For everything else, normalize text-equivalent structure differences.
  const finalChildren = VOID_TAGS.has(tag) ? [] : normalizeTextEquivalent(children, opts);

  // Bottom-up hash — recomputed after children are in their final form
  const hash = hashElement(tag, attrs, finalChildren);
  return { type: 'element', tag, attrs, children: finalChildren, hash };
}

function canonicalize(html: string, opts: DiffOptions): CanonNode {
  // xmlMode: true — avoids <html><head><body> wrapper injection.
  // React-rendered HTML is well-formed; xmlMode gives us a flat Document > [content] tree.
  const doc = parseDocument(html, { xmlMode: true });
  // Wrap doc in a synthetic root element so the walker has a single entry node.
  // We pass the Document node directly and treat it as root (isRoot=true).
  return walkAndCanonicalize(doc as unknown as AnyNode, opts, true);
}

/**
 * Make the children sequence forgiving of two specific text-equivalent
 * structural differences between MDX and MDXish:
 *
 *   1. Plain `<span>` wrappers (no attributes) — bare grouping with no semantic
 *      weight, replaced by their children.
 *   2. Adjacent text children — merged into one. MDX inserts `<!---->` between
 *      JSX text fragments which canonicalization drops to empty text, leaving
 *      runs of adjacent text nodes that MDXish would render as a single text.
 *
 * Joins on `' '` because in the source HTML there is virtually always
 * whitespace surrounding MDX's inline boundary markers; HTML's adjacent-text
 * rendering rules collapse that to a single space. The re-collapse + trim
 * keeps the merged value canonical.
 */
function normalizeTextEquivalent(children: CanonNode[], opts: DiffOptions): CanonNode[] {
  // Span-flatten and adjacent-text-merge are engine-bridging transforms: they
  // absorb MDX-specific serialization artifacts (bare <span> wrappers,
  // comment-split text nodes). Skip both in 'minimal' preset so same-engine
  // before/after comparisons surface real structural changes.
  if (opts.preset === 'minimal') return children;

  // Pass 1: flatten plain <span> wrappers.
  const flat: CanonNode[] = [];
  for (const c of children) {
    if (c.type === 'element' && c.tag === 'span' && Object.keys(c.attrs).length === 0) {
      flat.push(...c.children);
    } else {
      flat.push(c);
    }
  }

  // Pass 2: merge adjacent text children.
  const merged: CanonNode[] = [];
  for (const c of flat) {
    const last = merged[merged.length - 1];
    if (c.type === 'text' && last && last.type === 'text') {
      const combined = `${last.value} ${c.value}`.replace(/\s+/g, ' ').trim();
      merged[merged.length - 1] = { type: 'text', value: combined, hash: hashText(combined) };
    } else {
      merged.push(c);
    }
  }
  return merged;
}

/* ---------- diff walker ---------- */

function diffNodes(a: CanonNode, b: CanonNode, pathStr: string, changes: Change[]): void {
  if (a.hash === b.hash) return;

  if (a.type === 'text' || b.type === 'text') {
    if (a.type === 'text' && b.type === 'text') {
      if (a.value !== b.value) {
        changes.push({
          path: pathStr,
          kind: 'text',
          severity: 'content',
          left: a.value,
          right: b.value,
        });
      }
    } else {
      // One side is text, the other is an element — record as tag mismatch.
      changes.push({
        path: pathStr,
        kind: 'tag',
        severity: 'structural',
        left: a.type === 'text' ? `#text(${JSON.stringify(a.value)})` : `<${a.tag}>`,
        right: b.type === 'text' ? `#text(${JSON.stringify(b.value)})` : `<${b.tag}>`,
      });
    }
    return;
  }

  // Both are elements
  if (a.tag !== b.tag) {
    changes.push({
      path: pathStr,
      kind: 'tag',
      severity: 'structural',
      left: a.tag,
      right: b.tag,
    });
    return; // don't descend — children compare unrelated subtrees
  }

  // Attribute diff
  diffAttrs(a.attrs, b.attrs, pathStr, changes);

  // Children diff via simple greedy alignment with single-step lookahead
  alignChildren(a.children, b.children, pathStr, changes);
}

function diffAttrs(
  aAttrs: Record<string, string>,
  bAttrs: Record<string, string>,
  pathStr: string,
  changes: Change[],
): void {
  const keys = new Set([...Object.keys(aAttrs), ...Object.keys(bAttrs)]);
  for (const k of [...keys].sort()) {
    const av = aAttrs[k];
    const bv = bAttrs[k];
    // oxlint-disable-next-line no-continue
    if (av === bv) continue;
    changes.push({
      path: pathStr,
      kind: 'attr',
      attrName: k,
      severity: attrSeverity(k),
      left: av ?? null,
      right: bv ?? null,
    });
  }
}

function attrSeverity(name: string): Severity {
  if (CONTENT_ATTRS.has(name)) return 'content';
  if (name === 'class' || name === 'style') return 'structural';
  if (name.startsWith('data-') || name.startsWith('aria-')) return 'cosmetic';
  return 'structural';
}

/**
 * Align two child arrays using a single-step lookahead — at each unmatched
 * position we peek at `aChildren[i+1]` and `bChildren[j+1]` only, which is
 * enough to recover from one isolated insertion or deletion. Handles single
 * insertions / deletions / substitutions without cascading. For more complex
 * rearrangements (e.g. consecutive double-inserts) we degrade gracefully — a
 * long diff may not be optimal but it'll surface as "this page differs a lot"
 * which is the right signal.
 *
 * Children are visited in document position order.
 */
function alignChildren(
  aChildren: CanonNode[],
  bChildren: CanonNode[],
  parentPath: string,
  changes: Change[],
): void {
  let i = 0;
  let j = 0;
  while (i < aChildren.length && j < bChildren.length) {
    const a = aChildren[i];
    const b = bChildren[j];

    if (a.hash === b.hash) {
      i += 1;
      j += 1;
      // oxlint-disable-next-line no-continue
      continue;
    }

    // Lookahead: is a[i] missing in b (b[j] matches a[i+1])?
    if (i + 1 < aChildren.length && aChildren[i + 1].hash === b.hash) {
      changes.push(missingOrExtra('extra', a, `${parentPath}/${describeNode(a, i)}`));
      i += 1;
      // oxlint-disable-next-line no-continue
      continue;
    }

    // Lookahead: is b[j] extra (a[i] matches b[j+1])?
    if (j + 1 < bChildren.length && a.hash === bChildren[j + 1].hash) {
      changes.push(missingOrExtra('missing', b, `${parentPath}/${describeNode(b, j)}`));
      j += 1;
      // oxlint-disable-next-line no-continue
      continue;
    }

    // Otherwise substitute and recurse
    diffNodes(a, b, `${parentPath}/${describeNode(a, i)}`, changes);
    i += 1;
    j += 1;
  }

  // Trailing extras / missings
  while (i < aChildren.length) {
    const a = aChildren[i];
    changes.push(missingOrExtra('extra', a, `${parentPath}/${describeNode(a, i)}`));
    i += 1;
  }
  while (j < bChildren.length) {
    const b = bChildren[j];
    changes.push(missingOrExtra('missing', b, `${parentPath}/${describeNode(b, j)}`));
    j += 1;
  }
}

function missingOrExtra(kind: 'extra' | 'missing', node: CanonNode, pathStr: string): Change {
  // 'extra' = present in left, missing in right; 'missing' = the reverse.
  const isText = node.type === 'text';
  const severity: Severity = isText ? 'content' : 'structural';
  const repr =
    node.type === 'text' ? `#text(${JSON.stringify(node.value)})` : serializeShallow(node);
  return {
    path: pathStr,
    kind,
    severity,
    left: kind === 'extra' ? repr : null,
    right: kind === 'missing' ? repr : null,
  };
}

function describeNode(node: CanonNode, index: number): string {
  if (node.type === 'text') return `#text[${index}]`;
  return `${node.tag}[${index}]`;
}

function serializeShallow(node: ElementNode): string {
  // Attribute values may contain `"` (e.g. `title='he said "hi"'`); without
  // escaping the quote, the rendered diff string becomes malformed and
  // misleads during debugging. No security impact — this string is for
  // human-readable diff output only — but tightening keeps the output
  // unambiguous. Escape `"` to `&quot;` to mirror standard HTML attribute
  // escaping.
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => `${k}="${v.replace(/"/g, '&quot;')}"`)
    .join(' ');
  const head = attrs ? `<${node.tag} ${attrs}>` : `<${node.tag}>`;
  if (VOID_TAGS.has(node.tag)) return head;
  return node.children.length === 0
    ? `${head}</${node.tag}>`
    : `${head}…(${node.children.length} children)…</${node.tag}>`;
}

const SEVERITY_ORDER: Record<Severity, number> = { cosmetic: 0, structural: 1, content: 2 };

function pageSeverity(changes: Change[]): Severity {
  let max: Severity = 'cosmetic';
  for (const c of changes) {
    if (SEVERITY_ORDER[c.severity] > SEVERITY_ORDER[max]) max = c.severity;
  }
  return max;
}

/* ---------- public API ---------- */

/**
 * Diff two rendered HTML strings.
 *
 * The diff tool is engine-agnostic — `leftHtml` and `rightHtml` are simply
 * the two HTML strings to compare in that order. Common use cases:
 * - MDX vs MDXish (Suite B in this repo)
 * - Before vs after a `@readme/markdown` version bump on the same source
 * - Any two HTML strings a consumer wants to compare
 *
 * Both strings are canonicalized (whitespace collapse, class sort, attribute
 * normalization, noise-attr drop, heading-counter strip, void-tag handling,
 * text-equivalent merging) before comparison.
 *
 * A bottom-up content hash provides a fast-path: if both trees hash identically,
 * `{ status: 'match' }` is returned without a full walk.
 *
 * The returned `changes[]` is ordered by document position and is identical
 * across repeated calls on the same input. Each change carries `left` and
 * `right` fields corresponding to the two inputs.
 *
 * @param leftHtml  - First HTML string to compare.
 * @param rightHtml - Second HTML string to compare.
 * @param opts      - Optional canonicalization / diff configuration.
 * @returns `{ status: 'match' }` or `{ status: 'differ', severity, changes }`.
 */
export function diff(leftHtml: string, rightHtml: string, opts: DiffOptions = {}): DiffResult {
  const a = canonicalize(leftHtml, opts);
  const b = canonicalize(rightHtml, opts);

  if (!opts.noHashFastPath && a.hash === b.hash) {
    return { status: 'match' }; // no severity/changes on match
  }

  const changes: Change[] = [];
  diffNodes(a, b, '', changes);

  if (changes.length === 0) {
    // Hashes differ but the walker found no structural differences — hash-only
    // variation (unlikely in practice). Treat as match.
    return { status: 'match' };
  }

  return { status: 'differ', severity: pageSeverity(changes), changes };
}
