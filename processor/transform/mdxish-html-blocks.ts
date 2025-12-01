import type { HTMLBlock } from '../../types';
import type { Paragraph, Parent } from 'mdast';
import type { Transform } from 'mdast-util-from-markdown';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';
import { formatHTML } from '../utils';

/**
 * Collects text content from a node and its children recursively
 */
function collectTextContent(node: { children?: unknown[]; type?: string; value?: string }): string {
  const parts: string[] = [];

  if (node.type === 'text' && node.value) {
    parts.push(node.value);
  } else if (node.type === 'html' && node.value) {
    parts.push(node.value);
  } else if (node.type === 'inlineCode' && node.value) {
    parts.push(node.value);
  } else if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      if (typeof child === 'object' && child !== null) {
        parts.push(collectTextContent(child as { children?: unknown[]; type?: string; value?: string }));
      }
    });
  }

  return parts.join('');
}

/**
 * Extracts boolean attribute from HTML tag string
 * Handles both JSX expression syntax (safeMode={true}) and string syntax (safeMode="true")
 * Returns string "true"/"false" to survive rehypeRaw serialization
 */
function extractBooleanAttr(attrs: string, name: string): string | undefined {
  // Try JSX expression syntax first: name={true} or name={false}
  const jsxMatch = attrs.match(new RegExp(`${name}=\\{(true|false)\\}`));
  if (jsxMatch) {
    return jsxMatch[1]; // Return "true" or "false" as string
  }
  // Try string syntax: name="true" or name=true
  const stringMatch = attrs.match(new RegExp(`${name}="?(true|false)"?`));
  if (stringMatch) {
    return stringMatch[1]; // Return "true" or "false" as string
  }
  return undefined;
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
 * Checks if a node contains an HTMLBlock opening tag (but NOT closing tag - for split detection)
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
  // Only return found=true if we have opening but NOT closing (split case)
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
 * Transforms HTMLBlock MDX JSX elements to html-block MDAST nodes.
 * Handles both MDX JSX elements and template literal syntax: <HTMLBlock>{`...`}</HTMLBlock>
 */
const mdxishHtmlBlocks = (): Transform => tree => {
  // Handle HTMLBlock split across root-level children (newlines in content cause this)
  // Example: paragraph(<HTMLBlock>{`) + html(<div>...</div>) + paragraph(`}</HTMLBlock>)
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
          // Collect content between opening and closing (skip the containers, get inner content)
          const contentParts: string[] = [];
          for (let j = i; j <= closingIdx; j += 1) {
            const node = children[j] as { children?: unknown[]; type?: string; value?: string };
            contentParts.push(collectTextContent(node));
          }

          // Remove the opening/closing tags and template literal syntax from content
          let content = contentParts.join('');
          content = content.replace(/^<HTMLBlock[^>]*>\s*\{?\s*`?/, '').replace(/`?\s*\}?\s*<\/HTMLBlock>$/, '');

          const htmlString = formatHTML(content);
          const runScriptsMatch = attrs.match(/runScripts="?([^">\s]+)"?/);
          const runScripts = runScriptsMatch
            ? runScriptsMatch[1] === 'true'
              ? true
              : runScriptsMatch[1] === 'false'
                ? false
                : runScriptsMatch[1]
            : undefined;
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

  // Handle HTMLBlock parsed as HTML elements (when template literal contains HTML tags)
  // Example: <HTMLBlock>\n<div>content</div>\n</HTMLBlock>
  // The tags are parsed as separate 'html' nodes when content contains block-level HTML
  // When newlines are present, opening and closing tags may be in different block-level nodes
  visit(tree, 'html', (node, index, parent: Parent | undefined) => {
    if (!parent || index === undefined) return;

    const value = (node as { value?: string }).value;
    if (!value) return;

    // Case 1: Full HTMLBlock in single node (no blank lines in content)
    // e.g., "<HTMLBlock>\n<div>content</div>\n</HTMLBlock>"
    const fullMatch = value.match(/^<HTMLBlock(\s[^>]*)?>([\s\S]*)<\/HTMLBlock>$/);
    if (fullMatch) {
      const attrs = fullMatch[1] || '';
      let content = fullMatch[2] || '';

      // Remove template literal syntax if present: {`...`}
      content = content.replace(/^\s*\{\s*`/, '').replace(/`\s*\}\s*$/, '');

      const htmlString = formatHTML(content);
      const runScriptsMatch = attrs.match(/runScripts="?([^">\s]+)"?/);
      const runScripts = runScriptsMatch
        ? runScriptsMatch[1] === 'true'
          ? true
          : runScriptsMatch[1] === 'false'
            ? false
            : runScriptsMatch[1]
        : undefined;
      const safeMode = extractBooleanAttr(attrs, 'safeMode');

      parent.children[index] = createHTMLBlockNode(htmlString, node.position, runScripts, safeMode);
      return;
    }

    // Case 2: Opening tag only (blank lines caused split into sibling nodes)
    // e.g., "<HTMLBlock>" followed by sibling nodes, then "</HTMLBlock>"
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

      if (closingIdx === -1) return; // No closing tag found

      // Collect content between opening and closing tags, skipping template literal delimiters
      const contentParts: string[] = [];
      for (let i = index + 1; i < closingIdx; i += 1) {
        const sibling = siblings[i];
        // Skip { and } text nodes (template literal syntax)
        if (sibling.type === 'text') {
          const textVal = (sibling as { value?: string }).value;
          if (textVal === '{' || textVal === '}' || textVal === '{`' || textVal === '`}') {
            // eslint-disable-next-line no-continue
            continue;
          }
        }
        contentParts.push(collectTextContent(sibling as { children?: unknown[]; type?: string; value?: string }));
      }

      const htmlString = formatHTML(contentParts.join(''));
      const runScriptsMatch = value.match(/runScripts="?([^">\s]+)"?/);
      const runScripts = runScriptsMatch
        ? runScriptsMatch[1] === 'true'
          ? true
          : runScriptsMatch[1] === 'false'
            ? false
            : runScriptsMatch[1]
        : undefined;
      const safeMode = extractBooleanAttr(value, 'safeMode');

      // Replace opening tag with HTMLBlock node and remove consumed siblings
      parent.children[index] = createHTMLBlockNode(htmlString, node.position, runScripts, safeMode);
      parent.children.splice(index + 1, closingIdx - index);
    }
  });

  // Handle HTMLBlock syntax inside paragraphs: <HTMLBlock>{`...`}</HTMLBlock>
  // Example: Some text <HTMLBlock>{`<div>content</div>`}</HTMLBlock> more text
  // When HTMLBlock appears inline within a paragraph, tags and braces are parsed as inline elements
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

      // Look for opening brace `{` after HTMLBlock start
      if (htmlBlockStartIdx !== -1 && templateLiteralStartIdx === -1 && child.type === 'text') {
        const value = (child as { value?: string }).value;
        if (value === '{') {
          templateLiteralStartIdx = i;
        }
      }

      // Look for closing brace `}` before HTMLBlock end
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

      // Collect all content between { and }
      const templateContent: string[] = [];
      for (let i = templateLiteralStartIdx + 1; i < templateLiteralEndIdx; i += 1) {
        const child = children[i];
        if (child.type === 'inlineCode') {
          const value = (child as { value?: string }).value || '';
          templateContent.push(value);
        } else if (child.type === 'html') {
          const value = (child as { value?: string }).value || '';
          templateContent.push(value);
        } else if (child.type === 'text') {
          const value = (child as { value?: string }).value || '';
          templateContent.push(value);
        }
      }

      const htmlString = formatHTML(templateContent.join(''));

      let runScripts: boolean | string | undefined;
      let safeMode: string | undefined;
      if (openingTag.value) {
        const runScriptsMatch = openingTag.value.match(/runScripts="?([^">\s]+)"?/);
        if (runScriptsMatch) {
          runScripts =
            runScriptsMatch[1] === 'true' ? true : runScriptsMatch[1] === 'false' ? false : runScriptsMatch[1];
        }
        safeMode = extractBooleanAttr(openingTag.value, 'safeMode');
      }

      const mdNode = createHTMLBlockNode(htmlString, node.position, runScripts, safeMode);

      parent.children[index] = mdNode;
    }
  });

  // Ensure existing html-block nodes have their HTML properly structured
  visit(tree, 'html-block', (node: HTMLBlock) => {
    const html = node.data?.hProperties?.html;

    // Ensure the HTML string from hProperties is in the children as a text node
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
