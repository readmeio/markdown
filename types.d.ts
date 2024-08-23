import { Code, Data, Literal, Parent, Blockquote, Node, Root, Text, Table, BlockContent } from 'mdast';

import { NodeTypes } from './enums';
import { Element } from 'hast';
import { MDXContent, MDXModule } from 'mdx/types';
import { MdxJsxFlowElementHast } from 'mdast-util-mdx-jsx';

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

interface EmbedBlock extends Node {
  type: NodeTypes.embedBlock;
  title?: string;
  label?: string;
  url?: string;
  data: Data & {
    hName: 'embed';
    hProperties: {
      title: string;
      html?: string;
      providerName?: string;
      providerUrl?: string;
      url: string;
      image?: string;
      favicon?: string;
      iframe?: boolean;
    };
  };
}

interface Figure extends Node {
  type: NodeTypes.figure;
  data: {
    hName: 'figure';
  };
  children: [ImageBlock, FigCaption];
}

interface FigCaption extends Node {
  type: NodeTypes.figcaption;
  data: {
    hName: 'figcaption';
  };
  children: BlockContent[];
}

interface HTMLBlock extends Node {
  type: NodeTypes.htmlBlock;
  children: Text[];
  data: Data & {
    hName: 'html-block';
    hProperties: {
      runScripts?: boolean | string;
      html: string;
    };
  };
}

interface ImageBlock extends Parent {
  type: NodeTypes.imageBlock;
  url: string;
  alt: string;
  title: string;
  data: Data & {
    hName: 'img';
    hProperties: {
      align?: string;
      alt?: string;
      caption?: string;
      border?: string;
      src: string;
      title?: string;
      width?: string;
      lazy?: boolean;
      className?: string;
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

interface Tableau extends Omit<Table, 'type'> {
  type: NodeTypes.tableau;
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

interface Variable extends Node {
  data: Data & {
    hName: 'Variable';
    hProperties: {
      name: string;
    };
  };
  value: string;
}

declare module 'mdast' {
  interface BlockContentMap {
    [NodeTypes.callout]: Callout;
    [NodeTypes.codeTabs]: CodeTabs;
    [NodeTypes.embedBlock]: EmbedBlock;
    [NodeTypes.figure]: Figure;
    [NodeTypes.htmlBlock]: HTMLBlock;
    [NodeTypes.imageBlock]: ImageBlock;
    [NodeTypes.tableau]: Tableau;
    [NodeTypes.tutorialTile]: TutorialTile;
  }

  interface PhrasingContentMap {
    [NodeTypes.emoji]: Gemoji;
    [NodeTypes.i]: FaEmoji;
    [NodeTypes.variable]: Variable;
  }

  interface RootContentMap {
    [NodeTypes.callout]: Callout;
    [NodeTypes.codeTabs]: CodeTabs;
    [NodeTypes.embedBlock]: EmbedBlock;
    [NodeTypes.emoji]: Gemoji;
    [NodeTypes.figure]: Figure;
    [NodeTypes.htmlBlock]: HTMLBlock;
    [NodeTypes.i]: FaEmoji;
    [NodeTypes.imageBlock]: ImageBlock;
    [NodeTypes.tableau]: Tableau;
    [NodeTypes.tutorialTile]: TutorialTile;
    [NodeTypes.variable]: Variable;
  }
}

interface HastHeading extends Element {
  tagName: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  depth: number;
}

interface TocList extends Element {
  tagName: 'ul';
  children: TocListItem[];
}

interface Variables {
  user: Record<string, string>;
  defaults: { name: string; default: string }[];
}

interface TocListItem extends Element {
  tagName: 'li';
  children: (TocList | TocEntry)[];
}

interface TocEntry extends Element {
  tagName: 'a';
  children: (Element | Literal)[];
}

type IndexableElements = HastHeading | MdxJsxFlowElementHast;

interface RMDXModule extends MDXModule {
  toc: IndexableElements[];
  Toc: MDXContent;
}

interface CustomComponents extends Record<string, RMDXModule> {}

interface MdastComponents extends Record<string, Root> {}
