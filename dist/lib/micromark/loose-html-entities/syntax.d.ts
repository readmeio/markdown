import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';
import type { Extension } from 'micromark-util-types';
declare module 'micromark-util-types' {
    interface TokenTypeMap {
        looseHtmlEntity: 'looseHtmlEntity';
    }
}
export declare function looseHtmlEntity(): Extension;
export declare function looseHtmlEntityFromMarkdown(): FromMarkdownExtension;
