import { Image, Root } from 'mdast';
import { findAndReplace } from 'mdast-util-find-and-replace';
import Owlmoji from '../../lib/owlmoji';
import { NodeTypes } from '../../enums';
import { FaEmoji, Gemoji } from '../../types';

const regex = /:(?<name>\+1|[-\w]+):/g;

const gemojiReplacer = (_, name: string) => {
  switch (Owlmoji.kind(name)) {
    case 'gemoji': {
      const node: Gemoji = {
        type: NodeTypes.emoji,
        value: Owlmoji.nameToEmoji[name],
        name,
      };

      return node;
    }
    case 'fontawesome': {
      const node: FaEmoji = {
        type: NodeTypes.i,
        value: name,
        data: {
          hName: 'i',
          hProperties: {
            className: ['fa-regular', name],
          },
        },
      };

      return node;
    }
    case 'owlmoji': {
      const node: Image = {
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

      return node;
    }
    default:
      return false;
  }
};

const gemojiTransformer = () => (tree: Root) => {
  findAndReplace(tree, [regex, gemojiReplacer]);

  return tree;
};

export default gemojiTransformer;
