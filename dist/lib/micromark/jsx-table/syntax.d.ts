import type { Extension } from 'micromark-util-types';
declare module 'micromark-util-types' {
    interface TokenTypeMap {
        jsxTable: 'jsxTable';
        jsxTableData: 'jsxTableData';
    }
}
/**
 * Micromark extension that tokenizes `<Table>...</Table>` and `<table>...</table>`
 * as a single flow block.
 *
 * Prevents CommonMark HTML block type 6 from fragmenting table blocks at blank lines.
 */
export declare function jsxTable(): Extension;
