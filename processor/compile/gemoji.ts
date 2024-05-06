import { Node } from 'unist';

interface GemojiNode extends Node {
  name: string;
}

const gemoji = {
  handlers: {
    emoji: (node: GemojiNode) => `:${node.name}:`,
  },
};

export default gemoji;
