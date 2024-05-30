import type { Image } from 'mdast';

const image = (node: Image) => {
  const { align, border, width, src } = node.data?.hProperties || {};
  const complexImage: boolean = Boolean(width) || Boolean(border) || Boolean(align);
  
  if (complexImage) {
    const attributes = Object.keys(node.data?.hProperties)
      .map(key => `${key}="${node.data?.hProperties[key]}"`)
      .join(' ');
    return `<Image ${attributes} />`;
  }

  return `![${node.alt ?? ''}](${src ? src : node.url}${node.title ? ` "${node.title}")` : ')'}`;
}

export default image;
