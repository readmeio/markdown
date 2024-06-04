import { Code, Data, Literal, Parent, Blockquote, Node, Text } from 'mdast';
import { VFile } from 'vfile';
import { NodeTypes } from './enums';
import { Element, Root } from 'hast';

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

interface Embed extends Node {
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

interface RMDXImage extends Node {
  type: NodeTypes.image;
  url: string;
  alt: string;
  title: string;
  children: Text[];
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

interface TutorialTile extends Node {
  backgroundColor: string;
  emoji: string;
  id: string;
  link: string;
  slug: string;
  title: string;
  type: NodeTypes.tutorialTile;
}

declare module 'mdast' {
  interface BlockContentMap {
    [NodeTypes.callout]: Callout;
    [NodeTypes.codeTabs]: CodeTabs;
    [NodeTypes.embed]: Embed;
    [NodeTypes.htmlBlock]: HTMLBlock;
    [NodeTypes.tutorialTile]: TutorialTile;
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
    [NodeTypes.tutorialTile]: TutorialTile;
  }
}

type HastHeading = Element & {
  tagName: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  depth: number;
};

type VFileWithToc = VFile & {
  data: VFile['data'] & {
    toc?: {
      ast?: Root | Element;
      vfile?: VFile;
      headings?: HastHeading[];
    };
  };
};

interface CompiledComponents extends Record<string, VFileWithToc> {}
