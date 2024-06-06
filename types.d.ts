import { Code, Data, Literal, Parent, Blockquote, Node } from 'mdast';
import { NodeTypes } from './enums';
import { Element } from 'hast';
import { MDXModule } from 'mdx/types';
import { MdxJsxFlowElement } from 'mdast-util-mdx';

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

interface HastHeading extends Element {
  tagName: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  depth: number;
}

interface TocList extends Element {
  tagName: 'ul';
  children: TocListItem[];
}

interface TocListItem extends Element {
  tagName: 'li';
  children: (TocList | TocEntry)[];
}

interface TocEntry extends Element {
  tagName: 'a';
  children: (Element | Literal)[];
}

type IndexableElements = HastHeading | MdxJsxFlowElement;

interface RMDXModule extends MDXModule {
  toc: IndexableElements[];
}

interface CustomComponents extends Record<string, RMDXModule> {}
