import reusableContent from './reusable-content';
import singleCodeTabs from './single-code-tabs';
import tableCellInlineCode from './table-cell-inline-code';

export const remarkTransformers = [singleCodeTabs, reusableContent];
export const rehypeTransformers = [tableCellInlineCode];
