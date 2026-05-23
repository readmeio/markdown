import tableCellTransformer from './table-cell';
declare const transformers: ((() => (tree: any) => void) | typeof tableCellTransformer)[];
export default transformers;
