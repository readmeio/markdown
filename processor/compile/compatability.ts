import { NodeTypes } from '../../enums';

type CompatNodes =
  | { type: NodeTypes.variable; text: string }
  | { type: NodeTypes.glossary; data: { hProperties: { term: string } } }
  | { type: NodeTypes.reusableContent; tag: string };

const compatability = (node: CompatNodes) => {
  switch (node.type) {
    case NodeTypes.variable:
      return `<Variable name="${node.text}" />`;
    case NodeTypes.glossary:
      return `<Glossary>${node.data.hProperties.term}</Glossary>`;
    case NodeTypes.reusableContent:
      return `<${node.tag} />`;
    default:
      throw new Error('Unhandled node type!');
  }
};

export default compatability;
