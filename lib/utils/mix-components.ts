import type { CustomComponents } from '../../types';
import type { Element, Root } from 'hast';

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';


/**
 * Helper to serialize inner HTML from HAST nodes (preserving element structure)
 */
export function serializeInnerHTML(node: Element): string {
  if (!node.children || node.children.length === 0) {
    return '';
  }

  // Use rehype-stringify to convert children back to HTML
  const processor = unified().use(rehypeStringify, {
    allowDangerousHtml: true,
  });

  // Create a temporary tree with just the children
  const tempTree: Root = {
    type: 'root',
    children: node.children,
  };

  return String(processor.stringify(tempTree));
}

/**
 * Helper to check if a component exists in the components hash
 * Returns the component name from the components hash or null if not found
 */
export function componentExists(componentName: string, components: CustomComponents): string | null {
  // Convert component name to match component keys (components are typically PascalCase)
  // Try both the original name and PascalCase version
  const pascalCase = componentName
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  if (componentName in components) {
    return componentName;
  }
  if (pascalCase in components) {
    return pascalCase;
  }

  let matchingKey = null;
  Object.keys(components).forEach((key) => {
    if (key.toLowerCase() === componentName.toLowerCase() || key.toLowerCase() === pascalCase.toLowerCase()) {
      matchingKey = key;
    }
  });
  return matchingKey;
}

/**
 * Helper to get component from components hash
 */
export function getComponent(componentName: string, components: CustomComponents): React.ComponentType | null {
  // Try original name first
  if (componentName in components) {
    const mod = components[componentName];
    return mod.default || null;
  }

  // Try PascalCase version
  const pascalCase = componentName
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  if (pascalCase in components) {
    const mod = components[pascalCase];
    return mod.default || null;
  }

  // Try case-insensitive match across all component keys
  const normalizedName = componentName.toLowerCase();
  const matchingKey = Object.keys(components).find(key => key.toLowerCase() === normalizedName);

  if (matchingKey) {
    const mod = components[matchingKey];
    return mod.default || null;
  }

  return null;
}

/**
 * Render a React component to HTML string
 */
export async function renderComponent(
  componentName: string,
  props: Record<string, unknown>,
  components: CustomComponents,
  processMarkdown: (content: string) => Promise<string>,
): Promise<string> {
  const Component = getComponent(componentName, components);

  if (!Component) {
    return `<p style="color: red;">Component "${componentName}" not found</p>`;
  }

  try {
    // For components with children, process them as markdown with component support
    const processedProps = { ...props };
    if (props.children && typeof props.children === 'string') {
      // Process children through the full markdown pipeline (including custom components)
      const childrenHtml = await processMarkdown(props.children);
      // Pass children as raw HTML
      processedProps.children = React.createElement('div', {
        dangerouslySetInnerHTML: { __html: childrenHtml },
      });
    }

    // Render to HTML string
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(Component, processedProps));

    return html;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `<p style="color: red;">Error rendering component: ${errorMessage}</p>`;
  }
}

