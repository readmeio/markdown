import { Heading, Root, RootContent } from 'mdast';
import { VFile } from 'vfile';
import { toc } from 'mdast-util-toc';

import { Transformer } from 'unified';

const remarkToc = (): Transformer<Root, Root> => {
  return (tree: Root, file: VFile): void => {
    const headings = tree.children.filter((child: RootContent) => child.type === 'heading') as Heading[];
    const min = Math.min(...headings.map(({ depth }) => depth));
    // @note: copy the headings so we're not munging the real ast
    const proxy = headings.map(({ depth, ...rest }) => {
      return {
        ...rest,
        depth: depth - min + 1,
      } as Heading;
    });

    const { map } = toc({ type: 'root', children: proxy });
    file.data.toc = map;
  };
};

export default remarkToc;
