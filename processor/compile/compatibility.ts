import type { Html, Node, Nodes } from 'mdast';
import type { FigCaption, Figure, ImageBlock } from 'types';

import { toMarkdown } from 'mdast-util-to-markdown';

import { NodeTypes } from '../../enums';
import { formatProps } from '../utils';

interface EditorGlossary {
  children: [{ type: 'text'; value: string }];
  data: { hName: 'Glossary'; hProperties: { term: string } };
  type: NodeTypes.glossary;
}

interface CompatEmbed {
  data: { hProperties: Record<string, string> };
  html: string;
  type: 'embed';
}

type CompatNodes =
  | CompatEmbed
  | EditorGlossary
  | Figure
  | Html
  | { data: { hProperties: { className: string[] } }; type: 'i' }
  | { tag: string; type: NodeTypes.reusableContent }
  | { type: 'escape'; value: string }
  | { type: 'yaml'; value: string };

/*
 * Converts a (remark < v9) html node to a JSX string.
 *
 * First we replace html comments with the JSX equivalent. Then, we parse that
 * as html, and serialize it back as xml!
 *
 */
const compileHtml = (node: Html) => {
  const string = node.value.replaceAll(/<!--(.*)-->/gms, '{/*$1*/}');

  return string;
};

const figureToImageBlock = (node: Figure) => {
  const { align, border, width, src, url, alt, title, ...image } = node.children.find(
    (child: Node) => child.type === 'image',
  ) as ImageBlock & { url: string };
  const { className } = image.data.hProperties;
  const figcaption = node.children.find((child: Node) => child.type === 'figcaption') as FigCaption;

  const caption = figcaption ? toMarkdown(figcaption.children as unknown as Nodes).trim() : null;

  const attributes = {
    ...(align && { align }),
    ...(alt && { alt }),
    ...(className && { border: className === 'border' }),
    ...(border && { border }),
    ...(caption && { caption }),
    ...(title && { title }),
    ...(width && { width }),
    src: src || url,
  };

  return `<Image ${formatProps(attributes)} />`;
};

const embedToEmbedBlock = (node: CompatEmbed) => {
  const { html, ...embed } = node.data.hProperties;
  const attributes = {
    ...embed,
    ...(html && { html: encodeURIComponent(html) }),
  };
  return `<Embed ${formatProps(attributes)} />`;
};

const compatibility = (node: CompatNodes) => {
  switch (node.type) {
    case NodeTypes.glossary: {
      // Glossary terms will no longer be serialized as special node types in the Editor but we want to ensure that we compile historical
      // data correctly
      const term = node.data?.hProperties?.term || node.children[0].value;
      return `<Glossary>${term}</Glossary>`;
    }
    case NodeTypes.reusableContent:
      return `<${node.tag} />`;
    case 'html':
      return compileHtml(node);
    case 'escape':
      return `\\${node.value}`;
    case 'figure':
      return figureToImageBlock(node);
    case 'embed':
      return embedToEmbedBlock(node);
    case 'i':
      return `:${node.data.hProperties.className[1]}:`;
    case 'yaml':
      return `---\n${node.value}\n---`;
    default:
      throw new Error('Unhandled node type!');
  }
};

export default compatibility;
