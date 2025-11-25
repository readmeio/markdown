import type { Node, Parent, Paragraph } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

const isOpeningTag = (value: string) => {
  const match = value.match(/^<([A-Z][A-Za-z0-9]*)[^>]*>$/);
  return match?.[1];
};

const isClosingTag = (value: string, tag: string) => new RegExp(`^</${tag}>$`).test(value);

const stripClosingFromParagraph = (node: Paragraph, tag: string) => {
  if (!Array.isArray(node.children)) return { paragraph: node, found: false } as const;

  const children = [...node.children];
  const closingIndex = children.findIndex(
    child => child.type === 'html' && isClosingTag((child as { value?: string }).value || '', tag),
  );
  if (closingIndex === -1) return { paragraph: node, found: false } as const;

  children.splice(closingIndex, 1);

  return {
    paragraph: { ...node, children },
    found: true,
  } as const;
};

const replaceChild = (parent: Parent, index: number, replacement: Node) => {
  (parent.children as Node[]).splice(index, 2, replacement);
};

const mdxishComponentBlocks: Plugin<[], Parent> = () => tree => {
  const stack: Parent[] = [tree];

  const processChildNode = (parent: Parent, index: number) => {
    const node = parent.children[index];
    if (!node) return;

    if ('children' in node && Array.isArray(node.children)) {
      stack.push(node as Parent);
    }

    const value = (node as { value?: string }).value;
    if (node.type !== 'html' || typeof value !== 'string') return;

    const tag = isOpeningTag(value);
    if (!tag) return;

    const next = parent.children[index + 1];
    if (!next || next.type !== 'paragraph') return;

    const { paragraph, found } = stripClosingFromParagraph(next as Paragraph, tag);
    if (!found) return;

    const componentNode: MdxJsxFlowElement = {
      type: 'mdxJsxFlowElement',
      name: tag,
      attributes: [],
      children: paragraph.children as MdxJsxFlowElement['children'],
      position: {
        start: node.position?.start,
        end: next.position?.end,
      },
    };

    replaceChild(parent, index, componentNode as Node);
  };

  while (stack.length) {
    const parent = stack.pop();
    if (parent?.children) {
      parent.children.forEach((_child, index) => {
        processChildNode(parent, index);
      });
    }
  }

  return tree;
};

export default mdxishComponentBlocks;
