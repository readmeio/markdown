import { Root } from 'mdast';
import { findAndReplace } from 'mdast-util-find-and-replace';
import Owlmoji from '../../lib/owlmoji';

const regex = /:(?<name>\+1|[-\w]+):/g;

const gemojiTransformer = () => (tree: Root) => {
  findAndReplace(tree, [
    regex,
    (_, name) => {
      switch (Owlmoji.kind(name)) {
        case 'gemoji':
          return {
            type: 'emoji',
            value: Owlmoji.nameToEmoji[name],
            name,
          };
        case 'fontawesome':
          return {
            type: 'i',
            data: {
              hName: 'i',
              hProperties: {
                className: ['fa', name],
              },
            },
          };
        case 'owlmoji':
          return {
            type: 'image',
            title: `:${name}:`,
            alt: `:${name}:`,
            url: `/public/img/emojis/${name}.png`,
            data: {
              hProperties: {
                className: 'emoji',
                align: 'absmiddle',
                height: '20',
                width: '20',
              },
            },
          };
        default:
          return false;
      }
    },
  ]);

  return tree;
};

export const sanitize = sanitizeSchema => {
  sanitizeSchema.attributes.i = ['className'];
};

export default gemojiTransformer;
