import { emoji as Emoji } from '@readme/emojis';
import { Root } from 'mdast';
import { nameToEmoji } from 'gemoji';
import { findAndReplace } from 'mdast-util-find-and-replace';

const emojis = new Emoji();

const regex = /:(?<name>\+1|[-\w]+):/g;

const gemojiTransformer = () => (tree: Root) => {
  findAndReplace(tree, [
    regex,
    (_, name) => {
      if (Object.hasOwn(nameToEmoji, name)) {
        return {
          type: 'emoji',
          value: nameToEmoji[name],
          name,
        };
      } else if (emojis.is(name)) {
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
      } else if (name.substr(0, 3) === 'fa-') {
        return {
          type: 'i',
          data: {
            hName: 'i',
            hProperties: {
              className: ['fa', name],
            },
          },
        };
      }

      return false;
    },
  ]);

  return tree;
};

export const sanitize = sanitizeSchema => {
  sanitizeSchema.attributes.i = ['className'];
};

export default gemojiTransformer;
