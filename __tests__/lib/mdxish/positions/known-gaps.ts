import type { CorpusInput, CorpusVariant } from './corpus';
import type { PositionViolation, PositionViolationKind } from './position-invariant';

export interface KnownPositionGap {
  inputs?: string[];
  kinds: PositionViolationKind[];
  /** Matched against the violation's `path / node`. */
  location: RegExp;
  /** Why positions are wrong here. Delete the entry once it's fixed. */
  reason: string;
  variants?: CorpusVariant[];
}

const MISMATCH_KINDS: PositionViolationKind[] = ['point-mismatch', 'slice-mismatch'];
const ALL_KINDS: PositionViolationKind[] = [
  ...MISMATCH_KINDS,
  'missing-position',
  'outside-parent',
  'shared-point',
  'sibling-overlap',
];

const MAGIC_BLOCK_INPUTS = ['positions/magic-blocks.md', 'fixtures/magic-blocks-table'];

export const KNOWN_POSITION_GAPS: KnownPositionGap[] = [
  {
    reason: 'CRLF: JSX/HTML table re-parse falls back to a verbatim shift, drifting one column per line',
    kinds: MISMATCH_KINDS,
    location: /<[tT]able>|\btable\b/,
    variants: ['crlf'],
  },
  {
    reason: 'Magic blocks build nodes without positions, or keep offsets into their JSON',
    kinds: ALL_KINDS,
    location: /./,
    inputs: MAGIC_BLOCK_INPUTS,
  },
  {
    reason: 'Magic blocks in docs pages: api-header headings and html blocks have no document position',
    kinds: ALL_KINDS,
    location: /^root \/ heading( \/ text)?$|listItem \/ html-block$/,
    inputs: ['docs/getting-started.md', 'docs/lists.md'],
  },
  {
    reason: 'Code tabs reuse the first and last code block point objects',
    kinds: ['shared-point'],
    location: /code-tabs \/ code$/,
  },
  {
    reason: 'html-block text children have no position',
    kinds: ['missing-position'],
    location: /html-block \/ text$/,
  },
  {
    reason: '<HTMLBlock> inside a <div> splits the surrounding html into unpositioned parts',
    kinds: ['missing-position'],
    location: /^root \/ html$/,
    inputs: ['positions/html-and-code.md'],
  },
  {
    reason: 'Blockquote callout heading/body split reuses the paragraph range and skips the icon',
    kinds: ALL_KINDS,
    location: /rdme-callout \/ (heading|paragraph)/,
  },
  {
    reason: 'Variables are created without positions',
    kinds: ['missing-position'],
    location: /readme-variable$/,
  },
  {
    reason: 'Inline <Glossary>, <Anchor> and <<glossary:term>> nodes are created without positions',
    kinds: ['missing-position'],
    location: /(<Glossary>|readme-anchor|readme-glossary-item)( \/ text)?$/,
  },
  {
    reason: 'Malformed emphasis (`** bold**`) is rebuilt without positions',
    kinds: ['missing-position'],
    location: /paragraph( \/ (strong|emphasis))?( \/ text)?$/,
    inputs: ['positions/inline-syntax.md'],
  },
  {
    reason: 'Nested component ranges start at the line indent instead of the tag',
    kinds: ['slice-mismatch'],
    location: /(mdxJsxFlowElement<\w+>|rdme-callout) \/ mdxJsxFlowElement<\w+>$/,
  },
];

export const isKnownPositionGap = (gap: KnownPositionGap, violation: PositionViolation, input: CorpusInput) =>
  gap.kinds.includes(violation.kind) &&
  gap.location.test(`${violation.path} / ${violation.node}`) &&
  (!gap.inputs || gap.inputs.includes(input.name)) &&
  (!gap.variants || gap.variants.includes(input.variant));
