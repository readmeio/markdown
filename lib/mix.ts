import type { Root as HastRoot } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import type { PluggableList } from 'unified';
import type { VFile } from 'vfile';

interface Opts {
  file?: VFile | string;
  hast?: boolean;
  remarkTransformers?: PluggableList;
}

/**
 * This function behaves similarly to the `mdx` function, but it is used to mix both md and mdx content.
 * The base engine will be markdown based, but it will be able to process mdx content as well.
 *
 * How it works:
 * It behaves like a markdown engine but has the ability to detect and render mdx subnodes
 * This would enable looser syntax rules while still allowing for the use of mdx components and would
 * have a better and easier authoring experience.
 * @param _tree
 * @param _opts
 * @returns
 */
export const mix = (_tree: HastRoot | MdastRoot, _opts: Opts = {}): string => {
  // @todo: implement mix function
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = { _tree, _opts };
  return 'Hoot!';
};

export default mix;
