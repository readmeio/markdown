import type { CompileContext, Extension as FromMarkdownExtension, Handle } from 'mdast-util-from-markdown';
import type { FaEmoji, Gemoji } from 'types';

import { NodeTypes } from '../../../enums';
import Owlmoji from '../../owlmoji';

function exitGemoji(this: CompileContext, token: Parameters<Handle>[0]): void {
  const name = this.sliceSerialize(token).slice(1, -1); // strip surrounding colons

  switch (Owlmoji.kind(name)) {
    case 'gemoji': {
      this.enter({ type: NodeTypes.emoji, value: Owlmoji.nameToEmoji[name], name } as Gemoji, token);
      this.exit(token);
      break;
    }
    case 'fontawesome': {
      this.enter(
        {
          type: NodeTypes.i,
          value: name,
          data: { hName: 'i', hProperties: { className: ['fa-regular', name] } },
        } as FaEmoji,
        token,
      );
      this.exit(token);
      break;
    }
    case 'owlmoji': {
      this.enter(
        {
          type: NodeTypes.emoji,
          value: `:${name}:`,
          name,
          data: {
            hName: 'img',
            hProperties: {
              src: `/public/img/emojis/${name}.png`,
              alt: `:${name}:`,
              title: `:${name}:`,
              className: 'emoji',
              align: 'absmiddle',
              height: '20',
              width: '20',
            },
          },
        } as Gemoji,
        token,
      );
      this.exit(token);
      break;
    }
    default: {
      // Unknown shortcode, emit as literal text `:name:`
      this.enter({ type: 'text', value: `:${name}:` }, token);
      this.exit(token);
      break;
    }
  }
}

export function gemojiFromMarkdown(): FromMarkdownExtension {
  return {
    exit: {
      gemoji: exitGemoji,
    },
  };
}
