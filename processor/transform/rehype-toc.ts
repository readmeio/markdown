import { Transformer } from 'unified';
import { Root, Element } from 'hast';

import { h } from 'hastscript';
import { CompiledComponents, VFileWithToc } from '../../types';
import { MdxJsxFlowElement } from 'mdast-util-mdx';

type Heading = Element & {
  tagName: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
};

const MAX_DEPTH = 2;
const getDepth = (el: Heading) => parseInt(el.tagName.match(/^h(\d)/)[1]);

interface Options {
  components?: CompiledComponents;
}

const rehypeToc = ({ components }: Options): Transformer<Root, Root> => {
  return (tree: Root, file: VFileWithToc): void => {
    const headings = tree.children
      .filter(
        child =>
          (child.type === 'element' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(child.tagName)) ||
          (child.type === 'mdxJsxFlowElement' && child.name in components),
      )
      .flatMap(node =>
        node.type === 'mdxJsxFlowElement' ? components[node.name].data.toc.headings : node,
      ) as Heading[];

    if (!headings.length) return;

    file.data.toc = { headings };

    const min = Math.min(...headings.map(getDepth));
    const ast = h('ul');
    const stack: Element[] = [ast];

    headings.forEach(heading => {
      const depth = getDepth(heading) - min + 1;
      if (depth > MAX_DEPTH) return;

      while (stack.length < depth) {
        const ul = h('ul');

        stack[stack.length - 1].children.push(h('li', null, ul));
        stack.push(ul);
      }

      while (stack.length > depth) {
        stack.pop();
      }

      stack[stack.length - 1].children.push(h('li', null, h('p', null, heading.children)));
    });

    file.data.toc.ast = ast;
  };
};

export default rehypeToc;
