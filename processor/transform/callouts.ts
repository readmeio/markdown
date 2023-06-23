import { visit } from 'unist-util-visit';
import { Node } from 'unist';
import emojiRegex from 'emoji-regex';
import { Root } from 'remark-mdx';
import { Blockquote, BlockContent, Parent, DefinitionContent } from 'mdast';

const regex = `^(${emojiRegex().source}|⚠)(\\s+|$)`;

const themes: Record<string, string> = {
  '\uD83D\uDCD8': 'info',
  '\uD83D\uDEA7': 'warn',
  '\u26A0\uFE0F': 'warn',
  '\uD83D\uDC4D': 'okay',
  '\u2705': 'okay',
  '\u2757\uFE0F': 'error',
  '\u2757': 'error',
  '\uD83D\uDED1': 'error',
  '\u2049\uFE0F': 'error',
  '\u203C\uFE0F': 'error',
  '\u2139\uFE0F': 'info',
  '\u26A0': 'warn',
};

const toString = (node: Node): string => {
  if (node.value) return node.value as string;
  if (node.children) return (node.children as Node[]).map(child => toString(child)).join('');
  return '';
};

interface Callout extends Parent {
  type: 'rdme-callout';
  children: Array<BlockContent | DefinitionContent>;
}

const calloutTransformer = () => {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote | Callout) => {
      try {
        if (!(node.children[0].type === 'paragraph' && node.children[0].children[0].type === 'text')) return;

        const startText = node.children[0].children[0].value;
        const [match, icon] = startText.match(regex) || [];

        if (icon && match) {
          const title = startText.slice(match.length);
          const body = toString({ type: 'root', children: node.children.slice(1) } as Node);
          const data = {
            hName: 'rdme-callout',
            hProperties: {
              title,
              value: body,
              icon,
              theme: themes[icon] || 'default',
            },
          };

          node.type = 'rdme-callout';
          node.data = data;
          node.children[0].children[0].value = startText.slice(match.length);
        }
      } catch (e) {
        console.log(e);
      }
    });
  };
};

export default calloutTransformer;
