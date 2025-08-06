import type { NodeTypes } from './enums';
import type { Element } from 'hast';
import type {
  Code,
  Data,
  Literal,
  Parent,
  Blockquote,
  Node,
  Root,
  Text,
  Table,
  BlockContent,
  Link,
  RootContent,
} from 'mdast';
import type { MdxJsxFlowElementHast } from 'mdast-util-mdx-jsx';
import type { MDXModule } from 'mdx/types';

type Callout = Omit<Blockquote, 'children' | 'type'> & {
  children: BlockContent[];
  data: Data & {
    hName: 'Callout';
    hProperties: {
      empty: boolean;
      icon: string;
      theme: string;
    };
  };
  type: NodeTypes.callout;
};

interface CodeTabs extends Parent {
  children: Code[];
  data: Data & {
    hName: 'CodeTabs';
  };
  type: NodeTypes.codeTabs;
}

interface Embed extends Link {
  title: '@embed';
}

interface EmbedBlock extends Node {
  data: Data & {
    hName: 'embed';
    hProperties: {
      favicon?: string;
      html?: string;
      iframe?: boolean;
      image?: string;
      providerName?: string;
      providerUrl?: string;
      title: string;
      url: string;
    };
  };
  label?: string;
  title?: string;
  type: NodeTypes.embedBlock;
  url?: string;
}

interface Figure extends Node {
  children: [ImageBlock & { url: string }, FigCaption];
  data: {
    hName: 'figure';
  };
  type: NodeTypes.figure;
}

interface FigCaption extends Node {
  children: BlockContent[];
  data: {
    hName: 'figcaption';
  };
  type: NodeTypes.figcaption;
}

interface HTMLBlock extends Node {
  children: Text[];
  data: Data & {
    hName: 'html-block';
    hProperties: {
      html: string;
      runScripts?: boolean | string;
    };
  };
  type: NodeTypes.htmlBlock;
}

interface Plain extends Literal {
  type: NodeTypes.plain;
}

interface ImageBlockAttrs {
  align?: string;
  alt: string;
  border?: string;
  caption?: string;
  children?: RootContent[];
  className?: string;
  height?: string;
  lazy?: boolean;
  src: string;
  title: string;
  width?: string;
}

interface ImageBlock extends ImageBlockAttrs, Omit<Parent, 'children'> {
  data: Data & {
    hName: 'img';
    hProperties: ImageBlockAttrs;
  };
  type: NodeTypes.imageBlock;
}

interface Gemoji extends Literal {
  name: string;
  type: NodeTypes.emoji;
}

interface FaEmoji extends Literal {
  type: NodeTypes.i;
}

interface Tableau extends Omit<Table, 'type'> {
  type: NodeTypes.tableau;
}

interface Recipe extends Node {
  backgroundColor: string;
  emoji: string;
  id: string;
  link: string;
  slug: string;
  title: string;
  // Keeping both types for backwards compatibility
  type: NodeTypes.recipe | NodeTypes.tutorialTile;
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
    [NodeTypes.plain]: Plain;
    [NodeTypes.recipe]: Recipe;
    [NodeTypes.tableau]: Tableau;
    [NodeTypes.tutorialTile]: Recipe;
    link: Embed | Link;
  }

  interface PhrasingContentMap {
    [NodeTypes.emoji]: Gemoji;
    [NodeTypes.i]: FaEmoji;
    [NodeTypes.variable]: Variable;
    [NodeTypes.plain]: Plain;
  }

  interface RootContentMap {
    Link: Embed | Link;
    [NodeTypes.callout]: Callout;
    [NodeTypes.codeTabs]: CodeTabs;
    [NodeTypes.embedBlock]: EmbedBlock;
    [NodeTypes.emoji]: Gemoji;
    [NodeTypes.figure]: Figure;
    [NodeTypes.htmlBlock]: HTMLBlock;
    [NodeTypes.i]: FaEmoji;
    [NodeTypes.imageBlock]: ImageBlock;
    [NodeTypes.recipe]: Recipe;
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
