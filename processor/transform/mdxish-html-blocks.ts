import type { HTMLBlock } from '../../types';
import type { Paragraph, Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';
import { formatHTML } from '../utils';

import { base64Decode, HTML_BLOCK_CONTENT_END, HTML_BLOCK_CONTENT_START } from './preprocess-jsx-expressions';

/**
 * Decodes HTMLBlock content that was protected during preprocessing.
 * Content is wrapped in <!--RDMX_HTMLBLOCK:base64:RDMX_HTMLBLOCK-->
 */
function decodeProtectedContent(content: string): string {
  // Escape special regex characters in the markers
  const startEscaped = HTML_BLOCK_CONTENT_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const endEscaped = HTML_BLOCK_CONTENT_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const markerRegex = new RegExp(`${startEscaped}([A-Za-z0-9+/=]+)${endEscaped}`, 'g');
  return content.replace(markerRegex, (_match, encoded: string) => {
    try {
      return base64Decode(encoded);
    } catch {
      return encoded;
    }
  });
}

/**
 * Collects text content from a node and its children recursively
 */
function collectTextContent(node: { children?: unknown[]; lang?: string; type?: string; value?: string }): string {
  const parts: string[] = [];

  if (node.type === 'text' && node.value) {
    parts.push(node.value);
  } else if (node.type === 'html' && node.value) {
    parts.push(node.value);
  } else if (node.type === 'inlineCode' && node.value) {
    parts.push(node.value);
  } else if (node.type === 'code' && node.value) {
    // Reconstruct code fence syntax (markdown parser consumes opening ```)
    const lang = node.lang || '';
    const fence = `\`\`\`${lang ? `${lang}\n` : ''}`;
    parts.push(fence);
    parts.push(node.value);
    // Add newline before closing fence if missing
    const closingFence = node.value.endsWith('\n') ? '```' : '\n```';
    parts.push(closingFence);
  } else if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      if (typeof child === 'object' && child !== null) {
        parts.push(collectTextContent(child as { children?: unknown[]; lang?: string; type?: string; value?: string }));
      }
    });
  }

  return parts.join('');
}

/**
 * Extracts boolean attribute from HTML tag. Handles JSX (safeMode={true}) and string (safeMode="true") syntax.
 * Returns "true"/"false" string to survive rehypeRaw serialization.
 */
function extractBooleanAttr(attrs: string, name: string): string | undefined {
  // Try JSX syntax: name={true|false}
  const jsxMatch = attrs.match(new RegExp(`${name}=\\{(true|false)\\}`));
  if (jsxMatch) {
    return jsxMatch[1];
  }
  // Try string syntax: name="true"|true
  const stringMatch = attrs.match(new RegExp(`${name}="?(true|false)"?`));
  if (stringMatch) {
    return stringMatch[1];
  }
  return undefined;
}

/**
 * Extracts runScripts attribute from HTML tag. Returns boolean for "true"/"false", string for other values, or undefined if not found.
 */
function extractRunScriptsAttr(attrs: string): boolean | string | undefined {
  const runScriptsMatch = attrs.match(/runScripts="?([^">\s]+)"?/);
  if (!runScriptsMatch) {
    return undefined;
  }
  const value = runScriptsMatch[1];
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
}

/**
 * Creates an HTMLBlock node from HTML string and optional attributes
 */
function createHTMLBlockNode(
  htmlString: string,
  position: HTMLBlock['position'],
  runScripts?: boolean | string,
  safeMode?: string,
): HTMLBlock {
  return {
    position,
    children: [{ type: 'text', value: htmlString }],
    type: NodeTypes.htmlBlock,
    data: {
      hName: 'html-block',
      hProperties: {
        html: htmlString,
        ...(runScripts !== undefined && { runScripts }),
        ...(safeMode !== undefined && { safeMode }),
      },
    },
  };
}

/**
 * Checks for opening tag only (for split detection)
 */
function hasOpeningTagOnly(node: { children?: unknown[]; type?: string; value?: string }): {
  attrs: string;
  found: boolean;
} {
  let hasOpening = false;
  let hasClosed = false;
  let attrs = '';

  const check = (n: { children?: unknown[]; type?: string; value?: string }) => {
    if (n.type === 'html' && n.value) {
      if (n.value === '<HTMLBlock>') {
        hasOpening = true;
      } else {
        const match = n.value.match(/^<HTMLBlock(\s[^>]*)?>$/);
        if (match) {
          hasOpening = true;
          attrs = match[1] || '';
        }
      }
      if (n.value === '</HTMLBlock>' || n.value.includes('</HTMLBlock>')) {
        hasClosed = true;
      }
    }
    if (n.children && Array.isArray(n.children)) {
      n.children.forEach(child => {
        check(child as { children?: unknown[]; type?: string; value?: string });
      });
    }
  };

  check(node);
  // Return true only if opening without closing (split case)
  return { attrs, found: hasOpening && !hasClosed };
}

/**
 * Checks if a node contains an HTMLBlock closing tag
 */
function hasClosingTag(node: { children?: unknown[]; type?: string; value?: string }): boolean {
  if (node.type === 'html' && node.value) {
    if (node.value === '</HTMLBlock>' || node.value.includes('</HTMLBlock>')) return true;
  }
  if (node.children && Array.isArray(node.children)) {
    return node.children.some(child => hasClosingTag(child as { children?: unknown[]; type?: string; value?: string }));
  }
  return false;
}

/**
 * Transforms HTMLBlock MDX JSX to html-block nodes. Handles <HTMLBlock>{`...`}</HTMLBlock> syntax.
 */
const mdxishHtmlBlocks = (): Transform => tree => {
  // Handle HTMLBlock split across root children (caused by newlines)
  visit(tree, 'root', (root: Parent) => {
    const children = root.children;
    let i = 0;

    while (i < children.length) {
      const child = children[i] as { children?: unknown[]; type?: string; value?: string };
      const { attrs, found: hasOpening } = hasOpeningTagOnly(child);

      if (hasOpening) {
        // Find closing tag in subsequent siblings
        let closingIdx = -1;
        for (let j = i + 1; j < children.length; j += 1) {
          if (hasClosingTag(children[j] as { children?: unknown[]; type?: string; value?: string })) {
            closingIdx = j;
            break;
          }
        }

        if (closingIdx !== -1) {
          // Collect inner content between tags
          const contentParts: string[] = [];
          for (let j = i; j <= closingIdx; j += 1) {
            const node = children[j] as { children?: unknown[]; type?: string; value?: string };
            contentParts.push(collectTextContent(node));
          }

          // Remove the opening/closing tags and template literal syntax from content
          let content = contentParts.join('');
          content = content.replace(/^<HTMLBlock[^>]*>\s*\{?\s*`?/, '').replace(/`?\s*\}?\s*<\/HTMLBlock>$/, '');
          // Decode protected content that was base64 encoded during preprocessing
          content = decodeProtectedContent(content);

          const htmlString = formatHTML(content, true);
          const runScripts = extractRunScriptsAttr(attrs);
          const safeMode = extractBooleanAttr(attrs, 'safeMode');

          // Replace range with single HTMLBlock node
          const mdNode = createHTMLBlockNode(
            htmlString,
            (children[i] as { position?: unknown }).position as HTMLBlock['position'],
            runScripts,
            safeMode,
          );
          root.children.splice(i, closingIdx - i + 1, mdNode);
        }
      }
      i += 1;
    }
  });

  // Handle HTMLBlock parsed as HTML elements (when template literal contains block-level HTML tags)
  visit(tree, 'html', (node, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    const value = (node as { value?: string }).value;
    if (!value) return;

    // Case 1: Full HTMLBlock in single node
    const fullMatch = value.match(/^<HTMLBlock(\s[^>]*)?>([\s\S]*)<\/HTMLBlock>$/);
    if (fullMatch) {
      const attrs = fullMatch[1] || '';
      let content = fullMatch[2] || '';

      // Remove template literal syntax if present: {`...`}
      content = content.replace(/^\s*\{\s*`/, '').replace(/`\s*\}\s*$/, '');
      // Decode protected content that was base64 encoded during preprocessing
      content = decodeProtectedContent(content);

      const htmlString = formatHTML(content, true);
      const runScripts = extractRunScriptsAttr(attrs);
      const safeMode = extractBooleanAttr(attrs, 'safeMode');

      parent.children[index] = createHTMLBlockNode(htmlString, node.position, runScripts, safeMode);
      return;
    }

    // Case 2: Opening tag only (split by blank lines)
    if (value === '<HTMLBlock>' || value.match(/^<HTMLBlock\s[^>]*>$/)) {
      const siblings = parent.children;
      let closingIdx = -1;

      // Find closing tag in siblings
      for (let i = index + 1; i < siblings.length; i += 1) {
        const sibling = siblings[i];
        if (sibling.type === 'html') {
          const sibVal = (sibling as { value?: string }).value;
          if (sibVal === '</HTMLBlock>' || sibVal?.includes('</HTMLBlock>')) {
            closingIdx = i;
            break;
          }
        }
      }

      if (closingIdx === -1) return;

      // Collect content between tags, skipping template literal delimiters
      const contentParts: string[] = [];
      for (let i = index + 1; i < closingIdx; i += 1) {
        const sibling = siblings[i];
        // Skip template literal delimiters
        if (sibling.type === 'text') {
          const textVal = (sibling as { value?: string }).value;
          if (textVal === '{' || textVal === '}' || textVal === '{`' || textVal === '`}') {
            // eslint-disable-next-line no-continue
            continue;
          }
        }
        contentParts.push(collectTextContent(sibling as { children?: unknown[]; type?: string; value?: string }));
      }

      // Decode protected content that was base64 encoded during preprocessing
      const decodedContent = decodeProtectedContent(contentParts.join(''));
      const htmlString = formatHTML(decodedContent, true);
      const runScripts = extractRunScriptsAttr(value);
      const safeMode = extractBooleanAttr(value, 'safeMode');

      // Replace opening tag with HTMLBlock node, remove consumed siblings
      parent.children[index] = createHTMLBlockNode(htmlString, node.position, runScripts, safeMode);
      parent.children.splice(index + 1, closingIdx - index);
    }
  });

  // Handle HTMLBlock inside paragraphs (parsed as inline elements)
  visit(tree, 'paragraph', (node: Paragraph, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    const children = node.children || [];

    let htmlBlockStartIdx = -1;
    let htmlBlockEndIdx = -1;
    let templateLiteralStartIdx = -1;
    let templateLiteralEndIdx = -1;

    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];

      if (child.type === 'html' && typeof (child as { value?: string }).value === 'string') {
        const value = (child as { value: string }).value;
        if (value === '<HTMLBlock>' || value.match(/^<HTMLBlock\s[^>]*>$/)) {
          htmlBlockStartIdx = i;
        } else if (value === '</HTMLBlock>') {
          htmlBlockEndIdx = i;
        }
      }

      // Find opening brace after HTMLBlock start
      if (htmlBlockStartIdx !== -1 && templateLiteralStartIdx === -1 && child.type === 'text') {
        const value = (child as { value?: string }).value;
        if (value === '{') {
          templateLiteralStartIdx = i;
        }
      }

      // Find closing brace before HTMLBlock end
      if (htmlBlockStartIdx !== -1 && htmlBlockEndIdx === -1 && child.type === 'text') {
        const value = (child as { value?: string }).value;
        if (value === '}') {
          templateLiteralEndIdx = i;
        }
      }
    }

    if (
      htmlBlockStartIdx !== -1 &&
      htmlBlockEndIdx !== -1 &&
      templateLiteralStartIdx !== -1 &&
      templateLiteralEndIdx !== -1 &&
      templateLiteralStartIdx < templateLiteralEndIdx
    ) {
      const openingTag = children[htmlBlockStartIdx] as { value?: string };

      // Collect content between braces (handles code blocks)
      const templateContent: string[] = [];
      for (let i = templateLiteralStartIdx + 1; i < templateLiteralEndIdx; i += 1) {
        const child = children[i];
        templateContent.push(
          collectTextContent(child as { children?: unknown[]; lang?: string; type?: string; value?: string }),
        );
      }

      // Decode protected content that was base64 encoded during preprocessing
      const decodedContent = decodeProtectedContent(templateContent.join(''));
      const htmlString = formatHTML(decodedContent, true);

      const runScripts = openingTag.value ? extractRunScriptsAttr(openingTag.value) : undefined;
      const safeMode = openingTag.value ? extractBooleanAttr(openingTag.value, 'safeMode') : undefined;

      const mdNode = createHTMLBlockNode(htmlString, node.position, runScripts, safeMode);

      parent.children[index] = mdNode;
    }
  });

  // Ensure html-block nodes have HTML in children as text node
  visit(tree, 'html-block', (node: HTMLBlock) => {
    const html = node.data?.hProperties?.html;
    if (
      html &&
      (!node.children ||
        node.children.length === 0 ||
        (node.children.length === 1 && node.children[0].type === 'text' && node.children[0].value !== html))
    ) {
      node.children = [
        {
          type: 'text',
          value: html,
        },
      ];
    }
  });

  return tree;
};

export default mdxishHtmlBlocks;
