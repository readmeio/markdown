/**
 * TypeScript types for the render-diff HTML diffing tool.
 *
 * These types form the public contract for `lib/render-diff/differ.ts`.
 */

/**
 * Severity level of a single diff change or aggregate page diff result.
 *
 * - `cosmetic` — minor presentation differences (e.g. `data-*` / `aria-*` attrs)
 * - `structural` — tag, element, or layout differences
 * - `content` — visible text or meaningful attribute value differences
 */
export type Severity = 'content' | 'cosmetic' | 'structural';

/**
 * A single diffed change between two rendered HTML inputs.
 *
 * The diff tool is engine-agnostic — `left` and `right` are simply the two
 * HTML strings passed to `diff()` in that order. Suite B uses them as
 * MDX vs MDXish; other consumers (e.g. before/after a markdown version bump)
 * use them however they like.
 *
 * Each change is emitted at a specific document-position path.
 */
export interface Change {
  /**
   * Attribute name — populated only when `kind` is `'attr'`.
   */
  attrName?: string;
  /**
   * The type of difference detected.
   *
   * - `tag`     — element tag mismatch between `left` and `right`
   * - `attr`    — attribute present, missing, or different value
   * - `text`    — text node content differs
   * - `missing` — node present in `left` but absent in `right`
   * - `extra`   — node present in `right` but absent in `left`
   */
  kind: 'attr' | 'extra' | 'missing' | 'tag' | 'text';
  /**
   * String representation from the `left` input, or `null` when the node is absent.
   */
  left: string | null;
  /**
   * Document-position path of the diffed node (top-to-bottom tree-walk order).
   */
  path: string;
  /**
   * String representation from the `right` input, or `null` when the node is absent.
   */
  right: string | null;
  /**
   * Severity of this individual change.
   */
  severity: Severity;
}

/**
 * Result returned by `diff(leftHtml, rightHtml)`.
 *
 * Discriminated union on `status`:
 * - `'match'` arm collapses to `{ status: 'match' }` — no `severity` or `changes` keys.
 * - `'differ'` arm carries the full `{ status, severity, changes }` shape.
 *
 * TypeScript narrowing on `result.status === 'differ'` exposes `severity` and `changes`.
 */
export type DiffResult =
  | { changes: Change[]; severity: Severity; status: 'differ' }
  | { status: 'match' };

/**
 * Canonicalization preset for `diff()`.
 *
 * - `'cross-engine'` — full normalization including span-flatten and adjacent-text
 *   merge. Designed for MDX↔MDXish comparison (Suite B).
 * - `'minimal'` — lighter normalization; span-flatten and adjacent-text merge are
 *   skipped. Suitable for same-engine before/after comparison where those transforms
 *   would mask real structural changes.
 */
export type Preset = 'cross-engine' | 'minimal';

/**
 * Options accepted by `diff()`.
 *
 * All fields are optional. Default behaviour: hash fast-path enabled, all
 * heading counter suffixes stripped, no additional attributes ignored.
 */
export interface DiffOptions {
  /**
   * Additional attribute names to drop during canonicalization (lowercased).
   * Added to the built-in noise-attr set (`data-reactroot`, `data-testid`,
   * `suppresshydrationwarning`).
   */
  attrIgnore?: Set<string>;
  /**
   * When `true`, bypass the content-hash fast-path and always perform the full
   * tree walk. Intended for testing only.
   */
  noHashFastPath?: boolean;
  /**
   * When `true`, skip stripping `-N` counter suffixes from heading `id` attrs.
   * Default: `false` (suffixes are stripped so repeated headings compare equal).
   */
  preserveHeadingCounters?: boolean;
  /**
   * Canonicalization preset. Controls which structural-normalization transforms
   * are applied before comparison.
   *
   * - `'cross-engine'` (default) — full normalization including span-flatten
   *   and adjacent-text merge. Designed for MDX↔MDXish comparison (Suite B).
   * - `'minimal'` — lighter normalization; span-flatten and adjacent-text merge
   *   are skipped. Suitable for same-engine before/after comparison where those
   *   transforms would mask real structural changes.
   *
   * Every normalization `'minimal'` performs is also performed by `'cross-engine'`.
   * Default: omitting `preset` is equivalent to `'cross-engine'` (backward compatible).
   */
  preset?: Preset;
}
