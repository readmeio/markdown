import { Code, Data, Literal, Parent, Blockquote, Node } from 'mdast';
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

interface Embed extends Parent {
  type: NodeTypes.embed;
  data: Data & {
    hName: 'Embed';
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

type VFileWithToc = VFile & {
  data: VFile['data'] & {
    toc?: {
      ast?: Root;
      vfile?: VFile;
      heainds?: Heading[];
    };
  };
};

interface CompiledComponents {
  components: Record<string, VFileWithToc>;
}
