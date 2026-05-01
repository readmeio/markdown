/** Matches HTML tags (open, close, self-closing) with optional attributes. */
export const HTML_TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']*(?:"[^"]*"|'[^']*'))*[^>"']*)>/g;

/** Matches an HTML element from its opening tag to the matching closing tag. */
export const HTML_ELEMENT_BLOCK_RE = /<([a-zA-Z][a-zA-Z0-9-]*)[\s>][\s\S]*?<\/\1>/g;

/** Matches a newline with surrounding horizontal whitespace. */
export const NEWLINE_WITH_WHITESPACE_RE = /[^\S\n]*\n[^\S\n]*/g;

/** Matches a closing block-level tag followed by non-tag text or by a newline then non-blank content. */
export const CLOSE_BLOCK_TAG_BOUNDARY_RE = /<\/([a-zA-Z][a-zA-Z0-9-]*)>\s*(?:(?!<)(\S)|\n([^\n]))/g;

/** Strips HTML open/close tags. Used to detect non-tag inner text content. */
export const HTML_TAG_STRIP_RE = /<\/?[a-zA-Z][^>]*>/g;
