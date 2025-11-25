import type { CustomComponents } from '../types';
import type { Root } from 'hast';

import rehypeRaw from 'rehype-raw';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { VFile } from 'vfile';

import { mdxComponentHandlers } from '../processor/plugin/mdxish-handlers';
import { rehypeMdxishComponents } from '../processor/plugin/mdxish-components';
import { preprocessJSXExpressions, type JSXContext } from '../processor/transform/preprocess-jsx-expressions';
import mdxishComponentBlocks from '../processor/transform/mdxish-component-blocks';

import { loadComponents } from './utils/load-components';

export interface MixOpts {
  components?: CustomComponents;
  jsxContext?: JSXContext;
  preserveComponents?: boolean;
}

/**
 * Process markdown content with MDX syntax support
 * Detects and renders custom component tags from the components hash
 * Returns HTML string
 */
export function mdxish(mdContent: string, opts: MixOpts = {}) {
  const {
    components: userComponents = {},
    jsxContext = {
    // Add any variables you want available in expressions
    baseUrl: 'https://example.com',
    siteName: 'My Site',
    hi: 'Hello from MDX!',
    userName: 'John Doe',
    count: 42,
    price: 19.99,
    // You can add functions too
    uppercase: (str) => str.toUpperCase(),
    multiply: (a, b) => a * b,
  }} = opts;

  // Automatically load all components from components/ directory
  // Similar to prototype.js getAvailableComponents approach
  const autoLoadedComponents = loadComponents();

  // Merge components: user-provided components override auto-loaded ones
  // This allows users to override or extend the default components
  const components: CustomComponents = {
    ...autoLoadedComponents,
    ...userComponents,
  };

  // Pre-process JSX expressions: converts {expression} to evaluated values
  // This allows: <a href={'value'}> alongside <a href="value">
  const processedContent = preprocessJSXExpressions(mdContent, jsxContext);

  // Process with unified/remark/rehype pipeline
  // The rehypeMdxishComponents plugin hooks into the AST to find and transform custom component tags
  const mdToHastProcessor = unified()
    .use(remarkParse) // Parse markdown to AST
    .use(mdxishComponentBlocks) // Re-wrap PascalCase HTML blocks as component-like nodes
    .use(remarkRehype, { allowDangerousHtml: true, handlers: mdxComponentHandlers }) // Convert to HTML AST, preserve raw HTML
    .use(rehypeRaw) // Parse raw HTML in the AST (recognizes custom component tags)
    .use(rehypeMdxishComponents, {
      components,
      processMarkdown: (markdownContent: string) => mdxish(markdownContent, opts),
    }); // AST hook: finds component elements and renders them

  const vfile = new VFile({ value: processedContent });
  const hast = mdToHastProcessor.runSync(mdToHastProcessor.parse(processedContent), vfile) as Root;

  if (!hast) {
    throw new Error('Markdown pipeline did not produce a HAST tree.');
  }

  return hast;
}

export default mdxish;
