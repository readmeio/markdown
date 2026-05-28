/**
 * Skip certain regions / parts of the content that htmlparser2 should not handle
 */
export declare const maskNonTagRegions: (html: string) => string;
interface TagEvent {
    end: number;
    name: string;
    start: number;
}
/**
 * `isSelfClosing` — source ends with `/>`.
 * `isStrayCloser` — source starts with `</`. htmlparser2 follows the HTML5
 *   spec and rewrites stray void closers (`</br>`, `</p>`) into `onopentag`
 *   events; this flag lets consumers tell that apart from a real opener.
 */
interface OpenEvent extends TagEvent {
    isSelfClosing: boolean;
    isStrayCloser: boolean;
}
interface CloseEvent extends TagEvent {
    implicit: boolean;
}
interface TagWalkHandlers {
    onClose?: (event: CloseEvent) => void;
    onOpen?: (event: OpenEvent) => void;
}
/**
 * Drive htmlparser2 over `html` (after masking non-tag regions) and emit
 * tag-balance events. `start`/`end` use the original-string offsets, so
 * callers can splice against the input directly.
 */
export declare const walkTags: (html: string, handlers: TagWalkHandlers) => void;
export {};
