import type { CustomComponents } from '../types';

import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import { rehypeMdxishComponents } from '../processor/plugin/mdxish-components';
import { preprocessJSXExpressions, type JSXContext } from '../processor/transform/preprocess-jsx-expressions';

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
async function processMarkdown(mdContent: string, opts: MixOpts = {}): Promise<string> {
  const {
    components: userComponents = {},
    preserveComponents = false,
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
  const file = await unified()
    .use(remarkParse) // Parse markdown to AST
    .use(remarkRehype, { allowDangerousHtml: true }) // Convert to HTML AST, preserve raw HTML
    .use(rehypeRaw) // Parse raw HTML in the AST (recognizes custom component tags)
    .use(rehypeMdxishComponents, {
      components,
      preserveComponents,
      processMarkdown: (content: string) => processMarkdown(content, opts),
    }) // AST hook: finds component elements and renders them
    .use(rehypeStringify, { allowDangerousHtml: true }) // Stringify back to HTML
    .process(processedContent);

  return String(file);
}

const mix = async (text: string, opts: MixOpts = {}): Promise<string> => {
  return processMarkdown(text, opts);
};

export default mix;