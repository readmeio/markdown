import type { Plugin } from 'unified';
interface TailwindRootOptions {
    components: Record<string, string>;
    parseRoot?: boolean;
}
declare const tailwind: Plugin<[TailwindRootOptions]>;
export default tailwind;
