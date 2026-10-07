import type { Node, Parent } from 'mdast';

/**
 * Mark re-parsed subtree roots with the string their positions index into, so consumers
 * slicing by offset use the right source (see `Data.reparseSource`). Only roots are
 * stamped; descendants resolve via their nearest stamped ancestor. Roots a deeper
 * re-parse already stamped keep their own string.
 */
export const stampReparseSource = (roots: Node[], reparseSource: string) => {
  roots.forEach(root => {
    if (!root.data?.reparseSource) root.data = { ...root.data, reparseSource };
  });
};

/**
 * Splice `replacements` over `parent.children[index]`. They take over the replaced node's
 * position, so they also take over the coordinate space that position indexes into.
 */
export const replaceInheritingReparseSource = (parent: Parent, index: number, replacements: Node[]) => {
  const replacedSource = parent.children[index]?.data?.reparseSource;
  if (replacedSource) stampReparseSource(replacements, replacedSource);
  (parent.children as Node[]).splice(index, 1, ...replacements);
};

/**
 * The string `node`'s offsets index into: the nearest stamp on it or an ancestor, else the
 * document source.
 */
export const resolveReparseSource = (node: Node, ancestors: Node[], documentSource?: string) => {
  if (node.data?.reparseSource) return node.data.reparseSource;
  for (let i = ancestors.length - 1; i >= 0; i -= 1) {
    const { reparseSource } = ancestors[i].data ?? {};
    if (reparseSource) return reparseSource;
  }
  return documentSource;
};
