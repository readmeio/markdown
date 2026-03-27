import type { NodeTypes } from './enums';
import type { Element } from 'hast';
import type {
  Code,
  Data,
  Literal,
  Parent,
  Blockquote,
  Node,
  PhrasingContent,
  Root,
  Text,
  Table,
  BlockContent,
  Link,
  RootContent,
} from 'mdast';
import type { MdxJsxFlowElementHast } from 'mdast-util-mdx-jsx';
import type { MDXModule } from 'mdx/types';
import type { Position } from 'unist';

export type Callout = Omit<Blockquote, 'children' | 'type'> & {
  children: BlockContent[];
  data: Data & {
    hName: 'Callout' | 'rdme-callout';
    hProperties: {
      empty?: boolean;
      icon: string;
      theme: string;
    };
  };
  type: NodeTypes.callout;
};

export interface CodeTabs extends Parent {
  children: Code[];
  data?: Data & {
    hName: 'CodeTabs';
  };
  type: NodeTypes.codeTabs;
}

export interface Embed extends Link {
  title: '@embed';
}

export interface EmbedBlock extends Node {
  data: Data & {
    hName: 'Embed' | 'embed';
    hProperties: Record<string, unknown> & {
      favicon?: string;
      height?:string;
      href?: string;
      html?: string;
      iframe?: boolean;
      image?: string;
      provider?:string;
      providerName?: string;
      providerUrl?: string;
      title: string;
      typeOfEmbed?: string;
      url: string;
      width?: string;
    };
  };
  label?: string;
  title?: string;
  type: NodeTypes.embedBlock;
  url?: string;
}

export interface Figure extends Node {
  children: [ImageBlock & { url: string }, FigCaption];
  data: {
    hName: 'figure';
  };
  type: NodeTypes.figure;
}

export interface FigCaption extends Node {
  children: BlockContent[];
  data: {
    hName: 'figcaption';
  };
  type: NodeTypes.figcaption;
}

export interface HTMLBlock extends Node {
  children: Text[];
  data: Data & {
    hName: 'html-block';
    hProperties: {
      html: string;
      runScripts?: boolean | string;
      safeMode?: string;
    };
  };
  type: NodeTypes.htmlBlock;
}

export interface Plain extends Literal {
  type: NodeTypes.plain;
}

export type ImageAlign = 'center' | 'left' | 'right';

export interface ImageBlockAttrs {
  aiAltText?: boolean;
  align?: ImageAlign;
  alt: string;
  border?: boolean;
  caption?: string;
  children?: RootContent[];
  className?: string;
  height?: string;
  lazy?: boolean;
  sizing?: string;
  src: string;
  title: string;
  width?: string;
}

export interface ImageBlock extends ImageBlockAttrs, Omit<Parent, 'children'> {
  data: Data & {
    hName: 'img';
    hProperties: ImageBlockAttrs;
  };
  type: NodeTypes.imageBlock;
}

export interface Gemoji extends Node {
  name: string;
  type: NodeTypes.emoji;
  value?: string;
}

export interface FaEmoji extends Literal {
  type: NodeTypes.i;
}

export interface Tableau extends Omit<Table, 'type'> {
  type: NodeTypes.tableau;
}

export interface Recipe extends Node {
  backgroundColor: string;
  emoji: string;
  id: string;
  link: string;
  slug: string;
  title: string;
  // Keeping both types for backwards compatibility
  type: NodeTypes.recipe | NodeTypes.tutorialTile;
}

export interface ReusableContent extends Parent {
  children: RootContent[];
  tag: string;
  type: NodeTypes.reusableContent;
}

export interface Variable extends Node {
  data: Data & {
    hName: 'readme-variable' | 'Variable';
    hProperties: {
      name: string;
    };
  };
  value: string;
}

export interface Glossary extends Node {
  children: [{ type: 'text'; value: string }];
  data: Data & {
    hName: 'Glossary';
    hProperties: { term: string };
  };
  position?: Position;
  type: NodeTypes.glossary;
}

export interface Anchor extends Node {
  children: PhrasingContent[];
  data: Data & {
    hName: 'Anchor';
    hProperties: {
      href: string;
      label?: string;
      target?: string;
      title?: string;
    };
  };
  position?: Position;
  type: NodeTypes.anchor;
}

declare module 'mdast' {
  interface BlockContentMap {
    [NodeTypes.callout]: Callout;
    [NodeTypes.codeTabs]: CodeTabs;
    [NodeTypes.embedBlock]: EmbedBlock;
    [NodeTypes.figure]: Figure;
    [NodeTypes.htmlBlock]: HTMLBlock;
    [NodeTypes.imageBlock]: ImageBlock;
    [NodeTypes.plain]: Plain;
    [NodeTypes.recipe]: Recipe;
    [NodeTypes.reusableContent]: ReusableContent;
    [NodeTypes.tableau]: Tableau;
    [NodeTypes.tutorialTile]: Recipe;
    link: Embed | Link;
  }

  interface PhrasingContentMap {
    [NodeTypes.anchor]: Anchor;
    [NodeTypes.emoji]: Gemoji;
    [NodeTypes.i]: FaEmoji;
    [NodeTypes.glossary]: Glossary;
    [NodeTypes.variable]: Variable;
    [NodeTypes.plain]: Plain;
  }

  interface RootContentMap {
    Link: Embed | Link;
    [NodeTypes.anchor]: Anchor;
    [NodeTypes.callout]: Callout;
    [NodeTypes.codeTabs]: CodeTabs;
    [NodeTypes.embedBlock]: EmbedBlock;
    [NodeTypes.emoji]: Gemoji;
    [NodeTypes.figure]: Figure;
    [NodeTypes.glossary]: Glossary;
    [NodeTypes.htmlBlock]: HTMLBlock;
    [NodeTypes.i]: FaEmoji;
    [NodeTypes.imageBlock]: ImageBlock;
    [NodeTypes.plain]: Plain;
    [NodeTypes.recipe]: Recipe;
    [NodeTypes.reusableContent]: ReusableContent;
    [NodeTypes.tableau]: Tableau;
    [NodeTypes.tutorialTile]: Recipe;
    [NodeTypes.variable]: Variable;
  }
}

interface HastHeading extends Element {
  depth: number;
  tagName: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

interface TocList extends Element {
  children: TocListItem[];
  tagName: 'ul';
}

interface Variables {
  defaults: { default: string; name: string }[];
  user: Record<string, string>;
}

interface TocListItem extends Element {
  children: (TocEntry | TocList)[];
  tagName: 'li';
}

interface TocEntry extends Element {
  children: (Element | Literal)[];
  tagName: 'a';
}

type IndexableElements = HastHeading | MdxJsxFlowElementHast;

interface RMDXModule extends MDXModule {
  Toc: React.FC<Record<string, unknown>> | null;
  toc: IndexableElements[];
}

interface CustomComponents extends Record<string, RMDXModule> {}

interface MdastComponents extends Record<string, Root> {}

declare module '*.md' {
  const content: string;
  export default content;
}
