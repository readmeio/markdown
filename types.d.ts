import { Code, Data, Literal, Parent, Blockquote, Node } from 'mdast';
import { NodeTypes } from './enums';

type Callout = Omit<Blockquote, 'type'> & {
  type: NodeTypes.callout;
  data: Data & {
    hName: 'Callout';
    hProperties: {
      icon: string;
      empty: boolean;
    };
  };
};

interface CodeTabs extends Parent {
  type: NodeTypes.codeTabs;
  children: Code[];
  data: Data & {
    hName: 'CodeTabs';
  };
}

interface Embed extends Parent {
  type: NodeTypes.embed;
  data: Data & {
    hName: 'embed';
    hProperties: {
      title: string;
      url: string;
      image?: string;
      favicon?: string;
      iframe?: boolean;
      typeOfEmbed?: string;
    };
  };
}

interface HTMLBlock extends Node {
  type: NodeTypes.htmlBlock;
  data: Data & {
    hName: 'html-block';
    hProperties: {
      html: string;
    };
  };
}

interface Image extends Node {
  type: NodeTypes.image;
  url: string;
  alt: string;
  title: string;
  data: Data & {
    hName: 'image';
    hProperties: {
      align?: string;
      alt?: string;
      caption?: string;
      border?: string;
      src: string;
      title?: string;
      width?: string;
      lazy?: boolean;
    };
  };
}

interface Gemoji extends Literal {
  type: NodeTypes.emoji;
  name: string;
}

interface FaEmoji extends Literal {
  type: NodeTypes.i;
}

declare module 'mdast' {
  interface BlockContentMap {
    [NodeTypes.callout]: Callout;
    [NodeTypes.codeTabs]: CodeTabs;
    [NodeTypes.embed]: Embed;
    [NodeTypes.htmlBlock]: HTMLBlock;
  }

  interface PhrasingContentMap {
    [NodeTypes.emoji]: Gemoji;
    [NodeTypes.i]: FaEmoji;
  }

  interface RootContentMap {
    [NodeTypes.callout]: Callout;
    [NodeTypes.codeTabs]: CodeTabs;
    [NodeTypes.embed]: Embed;
    [NodeTypes.emoji]: Gemoji;
    [NodeTypes.i]: FaEmoji;
  }
}
