import type { MdxishOpts } from './mdxish';
import type { CustomComponents, IndexableElements, RMDXModule } from '../types';
import type { Root, Element } from 'hast';

import { fromHtml } from 'hast-util-from-html';
import { visit } from 'unist-util-visit';

import { extractToc, tocToHast } from '../processor/plugin/toc';

import mix from './mix';
import { loadComponents } from './utils/load-components';
import { componentExists } from './utils/mix-components';
import {
  buildRMDXModule,
  createRehypeReactProcessor,
  exportComponentsForRehype,
  type RenderOpts,
} from './utils/render-utils';

export type { RenderOpts as RenderHtmlOpts };

const MAX_DEPTH = 2;

/** Restore custom components from data attributes and process their children */
async function restoreCustomComponents(
  tree: Root,
  processMarkdown: (content: string) => Promise<string>,
  components: CustomComponents,
): Promise<void> {
  const transformations: { childrenHtml: string; node: Element }[] = [];

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

    // Clean up data attributes
    delete node.properties['data-rmd-component'];
    delete node.properties['data-rmd-props'];
    delete node.properties.dataRmdComponent;
    delete node.properties.dataRmdProps;

    // Resolve component name using case-insensitive matching
    node.tagName = componentExists(componentName, components) || componentName;

    // Queue children for markdown processing
    if (decodedProps.children && typeof decodedProps.children === 'string') {
      transformations.push({ childrenHtml: decodedProps.children, node });
      delete decodedProps.children;
    }

    // Apply sanitized props
    const sanitizedProps = Object.entries(decodedProps).reduce<Record<string, boolean | number | string>>(
      (memo, [key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          memo[key] = value;
        }
        return memo;
      },
      {},
    );

    node.properties = { ...node.properties, ...sanitizedProps };
  });

  // Process children as markdown
  await Promise.all(
    transformations.map(async ({ childrenHtml, node }) => {
      const processedHtml = await processMarkdown(childrenHtml);
      const htmlTree = fromHtml(processedHtml, { fragment: true });
      Object.assign(node, { children: htmlTree.children });
    }),
  );
}

/** Convert HTML string to React components */
const renderHtml = async (htmlString: string, opts: RenderOpts = {}): Promise<RMDXModule> => {
  const { components: userComponents = {}, variables, ...contextOpts } = opts;

  const components: CustomComponents = {
    ...loadComponents(),
    ...userComponents,
  };

  // Create markdown processor for children
  const processMarkdown = async (content: string): Promise<string> => {
    const jsxContext: MdxishOpts['jsxContext'] = variables
      ? Object.fromEntries(
          Object.entries(variables).map(([key, value]) => [key, typeof value === 'function' ? value : String(value)]),
        )
      : {};
    return mix(content, { components, jsxContext });
  };

  // Parse and restore custom components
  const tree = fromHtml(htmlString, { fragment: true }) as Root;
  await restoreCustomComponents(tree, processMarkdown, components);

  // Extract headings and render
  const headings = extractToc(tree, components);
  const componentsForRehype = exportComponentsForRehype(components);
  const processor = createRehypeReactProcessor(componentsForRehype);
  const content = processor.stringify(tree) as unknown as React.ReactNode;

  const tocHast = headings.length > 0 ? tocToHast(headings, MAX_DEPTH) : null;

  return buildRMDXModule(content, headings as IndexableElements[], tocHast, { ...contextOpts, variables });
};

export default renderHtml;
