import type { Extension } from 'micromark-util-types';
declare module 'micromark-util-types' {
    interface TokenTypeMap {
        gemoji: 'gemoji';
        gemojiMarker: 'gemojiMarker';
        gemojiName: 'gemojiName';
    }
}
export declare function gemoji(): Extension;
