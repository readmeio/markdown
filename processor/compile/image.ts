import type { Image } from 'mdast';

const image = (node: Image) => {
  const { align, className, width } = node.data?.hProperties || {};
  const complexImage: boolean = Boolean(width) || Boolean(className) || Boolean(align);
  if (complexImage) return `<Image ${JSON.stringify(node.data?.hProperties)} />`;

  return `![${node.alt}](${node.url}${node.title ? ` "${node.title}")` : ')'}`;
};

export default image;

