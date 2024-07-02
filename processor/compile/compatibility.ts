import { Html, Image, Node } from 'mdast';
import { fromHtml } from 'hast-util-from-html';
import { toMarkdown } from 'mdast-util-to-markdown';
import { toXast } from 'hast-util-to-xast';
import { toXml } from 'xast-util-to-xml';
import { NodeTypes } from '../../enums';
import { formatProps } from '../utils';

type CompatNodes =
  | { type: NodeTypes.glossary; data: { hProperties: { term: string } } }
  | { type: NodeTypes.glossary; data: { hName: 'Glossary' }; children: [{ type: 'text'; value: string }] }
  | { type: NodeTypes.reusableContent; tag: string }
  | { type: 'embed'; data: { hProperties: { [key: string]: string } } }
  | { type: 'escape'; value: string }
  | { type: 'figure'; children: [Image, { type: 'figcaption'; children: [{ type: 'text'; value: string }] }] }
  | { type: 'i'; data: { hProperties: { className: string[]}} }
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

const figureToImageBlock = (node: any) => {
  const { align, width, src, url, alt, title, ...image } = node.children.find((child: Node) => child.type === 'image');
  const { className } = image.data.hProperties;
  const figcaption = node.children.find((child: Node) => child.type === 'figcaption');

  const caption = figcaption
    ? toMarkdown({
        type: 'paragraph',
        children: figcaption.children,
      }).trim()
    : null;

  const attributes = {
    ...(align && { align }),
    ...(alt && { alt }),
    ...(className && { border: className === 'border' }),
    ...(caption && { caption }),
    ...(title && { title }),
    ...(width && { width }),
    src: src || url,
  };
  return `<Image ${formatProps(attributes)} />`;
};

const embedToEmbedBlock = (node: any) => {
  const { html, ...embed } = node.data.hProperties;
  const attributes = {
    ...embed,
    ...(html && { html: encodeURIComponent(html) }),
  };
  return `<Embed ${formatProps(attributes)} />`;
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
    case 'escape':
      return `\\${node.value}`;
    case 'figure':
      return figureToImageBlock(node);
    case 'embed':
      return embedToEmbedBlock(node);
    case 'i':
      return `:${node.data.hProperties.className[1]}:`;
    default:
      throw new Error('Unhandled node type!');
  }
};

export default compatibility;
