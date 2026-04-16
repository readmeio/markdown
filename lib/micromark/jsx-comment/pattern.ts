/**
 * Matches a JSX comment: `{/*`, content, `*\/}` — no whitespace tolerated
 * between the braces and the comment markers.
 *
 * This grammar is mirrored by the flow tokenizer in ./syntax.ts. Any change
 * here needs a mirror change in the state machine; the parity test in
 * __tests__/lib/micromark/jsx-comment-pattern-parity.test.ts locks the two
 * together so they can't silently drift.
 */
export const JSX_COMMENT_REGEX = /\{\/\*[^*]*(?:\*(?!\/)[^*]*)*\*\/\}/g;
