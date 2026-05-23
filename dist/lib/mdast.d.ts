import type { MdastOpts } from './ast-processor';
import type { Root } from 'mdast';
declare const mdast: (text: string, opts?: MdastOpts) => Root;
export default mdast;
