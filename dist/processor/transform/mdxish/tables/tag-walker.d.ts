interface TagEvent {
    end: number;
    name: string;
    start: number;
}
interface CloseEvent extends TagEvent {
    implicit: boolean;
}
interface TagWalkHandlers {
    onClose?: (event: CloseEvent) => void;
    onOpen?: (event: TagEvent) => void;
}
/**
 * Drive htmlparser2 over `html` (after masking non-tag regions) and emit
 * tag-balance events. `start`/`end` use the original-string offsets, so
 * callers can splice against the input directly.
 */
export declare const walkTags: (html: string, handlers: TagWalkHandlers) => void;
export {};
