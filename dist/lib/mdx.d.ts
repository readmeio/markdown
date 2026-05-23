import type { Root as HastRoot } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import type { PluggableList } from 'unified';
import type { VFile } from 'vfile';
interface Opts {
    file?: VFile | string;
    hast?: boolean;
    remarkTransformers?: PluggableList;
}
export declare const mdx: (tree: HastRoot | MdastRoot, { hast, remarkTransformers, file, ...opts }?: Opts) => string;
export default mdx;
