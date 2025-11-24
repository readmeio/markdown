import type { GlossaryTerm } from '../contexts/GlossaryTerms';
import type { CustomComponents, HastHeading, IndexableElements, RMDXModule, TocList } from '../types';
import type { Variables } from '../utils/user';
import type { Root, Element } from 'hast';

import { fromHtml } from 'hast-util-from-html';
import { h } from 'hastscript';
import React from 'react';
import rehypeReact from 'rehype-react';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import * as Components from '../components';
import Contexts from '../contexts';

import { processMixMdMdx as mixProcessMarkdown, type MixOpts } from './mix';
import plain from './plain';
import { loadComponents } from './utils/load-components';
import makeUseMDXComponents from './utils/makeUseMdxComponents';

export interface RenderHtmlOpts {
  baseUrl?: string;
  components?: CustomComponents;
  copyButtons?: boolean;
  terms?: GlossaryTerm[];
  theme?: 'dark' | 'light';
  variables?: Variables;
}

const MAX_DEPTH = 2;
const getDepth = (el: HastHeading) => parseInt(el.tagName?.match(/^h(\d)/)?.[1] || '1', 10);

/**
 * Find component name in components map using case-insensitive matching
 * Returns the actual key from the map, or null if not found
 */
function findComponentNameCaseInsensitive(
  componentName: string,
  components: CustomComponents,
): string | null {
  // Try exact match first
  if (componentName in components) {
    return componentName;
  }

  // Try case-insensitive match
  const normalizedName = componentName.toLowerCase();
  const matchingKey = Object.keys(components).find(key => key.toLowerCase() === normalizedName);

  if (matchingKey) {
    return matchingKey;
  }

  // Try PascalCase version
  const pascalCase = componentName
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  if (pascalCase in components) {
    return pascalCase;
  }

  // Try case-insensitive match on PascalCase
  const matchingPascalKey = Object.keys(components).find(key => key.toLowerCase() === pascalCase.toLowerCase());

  return matchingPascalKey || null;
}

async function restoreCustomComponents(
  tree: Root,
  processMarkdown: (content: string) => Promise<string>,
  components: CustomComponents,
): Promise<void> {
  const transformations: {
    childrenHtml: string;
    node: Element;
  }[] = [];

  visit(tree, 'element', (node: Element) => {
    if (!node.properties) return;
    const componentNameProp = node.properties['data-rmd-component'] ?? node.properties.dataRmdComponent;
    const componentName = Array.isArray(componentNameProp) ? componentNameProp[0] : componentNameProp;
    if (typeof componentName !== 'string' || !componentName) return;

    const encodedPropsProp = node.properties['data-rmd-props'] ?? node.properties.dataRmdProps;
    const encodedProps = Array.isArray(encodedPropsProp) ? encodedPropsProp[0] : encodedPropsProp;
    let decodedProps: Record<string, unknown> = {};
    if (typeof encodedProps === 'string') {
      try {
        decodedProps = JSON.parse(decodeURIComponent(encodedProps));
      } catch {
        decodedProps = {};
      }
    }

    delete node.properties['data-rmd-component'];
    delete node.properties['data-rmd-props'];
    delete node.properties.dataRmdComponent;
    delete node.properties.dataRmdProps;

    // Find the actual component name in the map using case-insensitive matching
    const actualComponentName = findComponentNameCaseInsensitive(componentName, components);
    if (actualComponentName) {
      node.tagName = actualComponentName;
    } else {
      // If component not found, keep the original name (might be a custom component)
      node.tagName = componentName;
    }

    // If children prop exists as a string, process it as markdown
    if (decodedProps.children && typeof decodedProps.children === 'string') {
      transformations.push({
        childrenHtml: decodedProps.children,
        node,
      });
      // Remove children from props - it will be replaced with processed content
      delete decodedProps.children;
    }

    const sanitizedProps = Object.entries(decodedProps).reduce<Record<string, boolean | number | string>>(
      (memo, [key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          memo[key] = value;
        }
        return memo;
      },
      {},
    );

    node.properties = {
      ...node.properties,
      ...sanitizedProps,
    };
  });

  // Process children as markdown for all components that need it
  await Promise.all(
    transformations.map(async ({ childrenHtml, node }) => {
      const processedHtml = await processMarkdown(childrenHtml);
      const htmlTree = fromHtml(processedHtml, { fragment: true });
      // Replace node's children with processed content
      // Use Object.assign to update the read-only property
      Object.assign(node, { children: htmlTree.children });
    }),
  );
}

/**
 * Extract headings (h1-h6) from HAST for table of contents
 */
function extractToc(tree: Root): HastHeading[] {
  const headings: HastHeading[] = [];

  const traverse = (node: Root | Root['children'][number]): void => {
    if (node.type === 'element' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tagName)) {
      headings.push(node as HastHeading);
    }

    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach(child => traverse(child));
    }
  };

  traverse(tree);
  return headings;
}

/**
 * Convert headings to TOC HAST structure (similar to tocToHast in toc.ts)
 */
function tocToHast(headings: HastHeading[] = []): TocList {
  if (headings.length === 0) {
    return h('ul') as TocList;
  }

  const min = Math.min(...headings.map(getDepth));
  const ast = h('ul') as TocList;
  const stack: TocList[] = [ast];

  headings.forEach(heading => {
    const depth = getDepth(heading) - min + 1;
    if (depth > MAX_DEPTH) return;

    while (stack.length < depth) {
      const ul = h('ul') as TocList;
      stack[stack.length - 1].children.push(h('li', null, ul) as TocList['children'][0]);
      stack.push(ul);
    }

    while (stack.length > depth) {
      stack.pop();
    }

    if (heading.properties) {
      const content = plain({ type: 'root', children: heading.children }) as string;
      const id = typeof heading.properties.id === 'string' ? heading.properties.id : '';
      stack[stack.length - 1].children.push(
        h('li', null, h('a', { href: `#${id}` }, content)) as TocList['children'][0],
      );
    }
  });

  return ast;
}

/**
 * Convert HTML string to React components
 * Similar to run.tsx but works with HTML instead of MDX
 */
const renderHtml = async (htmlString: string, _opts: RenderHtmlOpts = {}): Promise<RMDXModule> => {
  const { components: userComponents = {}, terms, variables, baseUrl, theme, copyButtons } = _opts;

  // Automatically load all components from components/ directory
  // Merge with user-provided components (user components override auto-loaded ones)
  const autoLoadedComponents = loadComponents();
  const components: CustomComponents = {
    ...autoLoadedComponents,
    ...userComponents,
  };

  // Create processMarkdown function for processing children
  // Use variables from opts as JSX context
  const processMarkdown = async (content: string): Promise<string> => {
    const jsxContext: MixOpts['jsxContext'] = variables
      ? Object.fromEntries(
          Object.entries(variables).map(([key, value]) => [
            key,
            typeof value === 'function' ? value : String(value),
          ]),
        )
      : {};
    return mixProcessMarkdown(content, {
      components,
      preserveComponents: true, // Always preserve when processing children
      jsxContext,
    });
  };

  // Parse HTML string to HAST
  const tree = fromHtml(htmlString, { fragment: true }) as Root;

  await restoreCustomComponents(tree, processMarkdown, components);

  // Extract TOC from HAST
  const headings = extractToc(tree);
  const toc: IndexableElements[] = headings;

  // Prepare component mapping
  // Include both original case and lowercase versions for case-insensitive matching
  const exportedComponents = Object.entries(components).reduce((memo, [tag, mod]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { default: Content, toc: _toc, Toc: _Toc, ...rest } = mod;
    // Store with original case
    memo[tag] = Content;
    // Also store lowercase version for case-insensitive matching
    const lowerTag = tag.toLowerCase();
    if (lowerTag !== tag) {
      memo[lowerTag] = Content;
    }
    if (rest) {
      Object.entries(rest).forEach(([subTag, component]) => {
        memo[subTag] = component;
        // Also store lowercase version
        const lowerSubTag = subTag.toLowerCase();
        if (lowerSubTag !== subTag) {
          memo[lowerSubTag] = component;
        }
      });
    }
    return memo;
  }, {});

  const componentMap = makeUseMDXComponents(exportedComponents);
  const componentsForRehype = componentMap();

  // Convert HAST to React using rehype-react via unified
  // @ts-expect-error - rehype-react types are incompatible with React.Fragment return type
  const processor = unified().use(rehypeReact, {
    createElement: React.createElement,
    Fragment: React.Fragment,
    components: componentsForRehype,
  });

  // Process the tree - rehype-react replaces stringify to return React elements
  // It may return a single element, fragment, or array
  const ReactContent = processor.stringify(tree) as unknown as React.ReactNode;

  // Generate TOC component if headings exist
  let Toc: React.FC<{ heading?: string }> | undefined;
  if (headings.length > 0) {
    const tocHast = tocToHast(headings);
    // @ts-expect-error - rehype-react types are incompatible with React.Fragment return type
    const tocProcessor = unified().use(rehypeReact, {
      createElement: React.createElement,
      Fragment: React.Fragment,
      components: { p: React.Fragment },
    });
    const tocReactElement = tocProcessor.stringify(tocHast) as unknown as React.ReactNode;

    const TocComponent = (props: { heading?: string }) =>
      tocReactElement ? (
        <Components.TableOfContents heading={props.heading}>{tocReactElement}</Components.TableOfContents>
      ) : null;
    TocComponent.displayName = 'Toc';
    Toc = TocComponent;
  }

  const DefaultComponent = () => (
    <Contexts baseUrl={baseUrl} copyButtons={copyButtons} terms={terms} theme={theme} variables={variables}>
      {ReactContent}
    </Contexts>
  );

  return {
    default: DefaultComponent,
    toc,
    Toc: Toc || (() => null),
    stylesheet: undefined,
  } as RMDXModule;
};

export default renderHtml;
