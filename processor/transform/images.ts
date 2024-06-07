import { visit } from 'unist-util-visit';

const imageTransformer = () => {
  return (tree: any) => {
    visit(tree, 'paragraph', (node, i, parent) => {
      // check if inline or already transformed
      if (parent.type !== 'root' || node.children?.length > 1 || node.children[0].type !== 'image') return;
      const [{ alt, url, title, type }] = node.children;

      const newNode = {
        type: type,
        alt: alt,
        children: [],
        title: title,
        url: url,
        data: {
          hName: 'image',
          hProperties: { 
            ...(alt && { alt }),
            src: url,
            ...(title && { title }),
          },
        },
        position: node.position,
      };

      parent.children.splice(i, 1, newNode);
    });
  };
};

export default imageTransformer;