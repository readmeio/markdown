import type { Extension } from 'micromark-util-types';
declare module 'micromark-util-types' {
    interface TokenTypeMap {
        legacyVariable: 'legacyVariable';
        legacyVariableMarkerEnd: 'legacyVariableMarkerEnd';
        legacyVariableMarkerStart: 'legacyVariableMarkerStart';
        legacyVariableValue: 'legacyVariableValue';
    }
}
export declare function legacyVariable(): Extension;
