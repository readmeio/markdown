/** Matches HTML tags (open, close, self-closing) with optional attributes. */
export declare const HTML_TAG_RE: RegExp;
/** Matches an HTML element from its opening tag to the matching closing tag. */
export declare const HTML_ELEMENT_BLOCK_RE: RegExp;
/** Matches a newline with surrounding horizontal whitespace. */
export declare const NEWLINE_WITH_WHITESPACE_RE: RegExp;
/** Matches a closing block-level tag followed by non-tag text or by a newline then non-blank content. */
export declare const CLOSE_BLOCK_TAG_BOUNDARY_RE: RegExp;
/** Strips HTML open/close tags. Used to detect non-tag inner text content. */
export declare const HTML_TAG_STRIP_RE: RegExp;
