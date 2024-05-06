import { Code, Data, Literal, Parent } from 'mdast';
import { NodeTypes } from './enums';

interface CodeTabs extends Parent {
  type: NodeTypes.codeTabs;
  children: Code[];
  data: Data & {
    hName: 'CodeTabs';
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
    [NodeTypes.codeTabs]: CodeTabs;
  }

  interface PhrasingContentMap {
    [NodeTypes.codeTabs]: CodeTabs;
    [NodeTypes.emoji]: Gemoji;
    [NodeTypes.i]: FaEmoji;
  }

  interface RootContentMap {
    [NodeTypes.codeTabs]: CodeTabs;
    [NodeTypes.emoji]: Gemoji;
    [NodeTypes.i]: FaEmoji;
  }
}
