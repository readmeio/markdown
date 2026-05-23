import type { Transform } from 'mdast-util-from-markdown';
interface Options {
    components: Record<string, string>;
    html?: boolean;
}
declare const readmeComponents: (opts: Options) => () => Transform;
export default readmeComponents;
