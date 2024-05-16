import { visit } from 'unist-util-visit';
import emojiRegex from 'emoji-regex';
import { Blockquote, BlockContent, Parent, DefinitionContent } from 'mdast';

const regex = `^(${emojiRegex().source}|⚠)(\\s+|$)`;

interface Callout extends Parent {
  type: 'rdme-callout';
  children: Array<BlockContent | DefinitionContent>;
}

const calloutTransformer = () => {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: Blockquote | Callout) => {
      try {
        if (!(node.children[0].type === 'paragraph' && node.children[0].children[0].type === 'text')) return;

        const startText = node.children[0].children[0].value;
        const [match, icon] = startText.match(regex) || [];

        if (icon && match) {
          const heading = startText.slice(match.length);

          node.children.shift();
          node.type = 'rdme-callout';
          node.data = {
            hName: 'Callout',
            hProperties: {
              heading,
              icon,
            },
          };
        }
      } catch (e) {
        console.log(e);
      }
    });
  };
};

export default calloutTransformer;
