import { Html } from 'mdast';
import { fromHtml } from 'hast-util-from-html';
import { toXast } from 'hast-util-to-xast';
import { toXml } from 'xast-util-to-xml';
import { NodeTypes } from '../../enums';

type CompatNodes =
  | { type: NodeTypes.glossary; data: { hProperties: { term: string } } }
  | { type: NodeTypes.glossary; data: { hName: 'Glossary' }; children: [{ type: 'text'; value: string }] }
  | { type: NodeTypes.reusableContent; tag: string }
  | Html;

/*
 * Converts a (remark < v9) html node to a JSX string.
 *
 * First we replace html comments with the JSX equivalent. Then, we parse that
 * as html, and serialize it back as xml!
 *
 */
const html = (node: Html) => {
  const string = node.value.replaceAll(/<!--(.*)-->/gms, '{/*$1*/}');
  const hast = fromHtml(string);
  const xast = toXast(hast);
  const xml = toXml(xast, { closeEmptyElements: true });

  return xml.replace(/<html.*<body>(.*)<\/body><\/html>/ms, '$1');
};

const compatibility = (node: CompatNodes) => {
  switch (node.type) {
    case NodeTypes.glossary:
      // @ts-expect-error
      const term = node.data?.hProperties?.term || node.children[0].value;
      return `<Glossary>${term}</Glossary>`;
    case NodeTypes.reusableContent:
      return `<${node.tag} />`;
    case 'html':
      return html(node);
    default:
      throw new Error('Unhandled node type!');
  }
};

export default compatibility;
