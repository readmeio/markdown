import { VFile } from 'vfile';

import { Transformer } from 'unified';
import { Root, Element } from 'hast';

import { h } from 'hastscript';

type Heading = Element & {
  tagName: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
};

const MAX_DEPTH = 2;
const getDepth = (el: Heading) => parseInt(el.tagName.match(/^h(\d)/)[1]);

const rehypeToc = (): Transformer<Root, Root> => {
  return (tree: Root, file: VFile): void => {
    // @ts-ignore
    const headings = tree.children.filter(
      child => child.type === 'element' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(child.tagName),
    ) as Heading[];
    if (!headings.length) return;

    const min = Math.min(...headings.map(getDepth));
    const root = h();
    root.children.push(h('ul'));
    const stack: Element[] = [root.children[0] as Element];

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

    file.data.toc = root;
  };
};

export default rehypeToc;
