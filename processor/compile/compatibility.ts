import { Html } from 'mdast';
import { NodeTypes } from '../../enums';

type CompatNodes =
  | { type: NodeTypes.variable; text: string }
  | { type: NodeTypes.glossary; data: { hProperties: { term: string } } }
  | { type: NodeTypes.glossary; data: { hName: 'Glossary' }; children: [{ type: 'text'; value: string }] }
  | { type: NodeTypes.reusableContent; tag: string }
  | Html;

const compatibility = (node: CompatNodes) => {
  switch (node.type) {
    case NodeTypes.variable:
      return `<Variable name="${node.text}" />`;
    case NodeTypes.glossary:
      // @ts-expect-error
      const term = node.data?.hProperties?.term || node.children[0].value;
      return `<Glossary>${term}</Glossary>`;
    case NodeTypes.reusableContent:
      return `<${node.tag} />`;
    case 'html':
      return node.value.replaceAll(/<!--(.*)-->/g, '{/*$1*/}');
    default:
      throw new Error('Unhandled node type!');
  }
};

export default compatibility;
