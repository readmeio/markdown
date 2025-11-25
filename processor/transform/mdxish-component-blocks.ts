import type { Node, Parent, Paragraph, RootContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

const isOpeningTag = (value: string) => {
  const match = value.match(/^<([A-Z][A-Za-z0-9]*)[^>]*>$/);
  return match?.[1];
};

const extractOpeningAndContent = (value: string) => {
  const match = value.match(/^<([A-Z][A-Za-z0-9]*)[^>]*>([\s\S]*)$/);
  if (!match) return null;

  const [, tag, content = ''] = match;
  return { tag, content };
};

const isSelfClosingTag = (value: string) => {
  const match = value.match(/^<([A-Z][A-Za-z0-9]*)([^>]*)\/>$/);
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

const parseMdChildren = (value: string): RootContent[] => {
  const parsed = unified().use(remarkParse).parse(value);
  return parsed.children || [];
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

    let tag = isOpeningTag(value);
    let extraChildren: RootContent[] = [];

    const selfClosing = isSelfClosingTag(value);
    if (selfClosing) {
      const componentNode: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: selfClosing,
        attributes: [],
        children: [],
        position: node.position,
      };
      (parent.children as Node[]).splice(index, 1, componentNode as Node);
      return;
    }

    if (!tag) {
      const result = extractOpeningAndContent(value);
      if (!result) return;
      tag = result.tag;
      extraChildren = parseMdChildren(result.content.trimStart());
    }

    const next = parent.children[index + 1];
    if (!next || next.type !== 'paragraph') return;

    const { paragraph, found } = stripClosingFromParagraph(next as Paragraph, tag);
    if (!found) return;

    const componentNode: MdxJsxFlowElement = {
      type: 'mdxJsxFlowElement',
      name: tag,
      attributes: [],
      children: [...(extraChildren as MdxJsxFlowElement['children']), ...(paragraph.children as MdxJsxFlowElement['children'])],
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
