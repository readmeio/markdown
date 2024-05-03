import { Code, Data, Literal } from 'mdast';
import { NodeTypes } from './enums';

interface CodeTabs extends Literal {
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

declare module 'mdast' {
  interface BlockContentMap {
    [NodeTypes.codeTabs]: CodeTabs;
  }

  interface PhrasingContentMap {
    [NodeTypes.codeTabs]: CodeTabs;
    [NodeTypes.emoji]: Gemoji;
  }

  interface RootContentMap {
    [NodeTypes.codeTabs]: CodeTabs;
    [NodeTypes.emoji]: Gemoji;
  }
}
