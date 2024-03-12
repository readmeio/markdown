import singleCodeTabs from './single-code-tabs';
import tableCellInlineCode from './table-cell-inline-code';

export const remarkTransformers = [singleCodeTabs];
export const rehypeTransformers = [tableCellInlineCode];
