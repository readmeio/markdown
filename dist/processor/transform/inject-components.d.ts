import type { MdastComponents } from '../../types';
import type { Transform } from 'mdast-util-from-markdown';
interface Options {
    components?: MdastComponents;
}
declare const injectComponents: (opts: Options) => () => Transform;
export default injectComponents;
