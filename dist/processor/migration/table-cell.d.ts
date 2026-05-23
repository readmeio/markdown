import type { Root } from 'mdast';
import type { VFile } from 'vfile';
declare function tableCellTransformer(): (tree: Root, vfile: VFile) => Root;
export default tableCellTransformer;
