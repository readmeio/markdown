/* eslint-disable no-param-reassign */
require('./styles/main.scss');

const MDX = require('@mdx-js/mdx');
const Variable = require('@readme/variable');
const generateTOC = require('mdast-util-toc');
const React = require('react');
const jsxRuntime = require('react/jsx-runtime');
const rehypeRaw = require('rehype-raw');
const rehypeReact = require('rehype-react');
const rehypeSanitize = require('rehype-sanitize');
const rehypeStringify = require('rehype-stringify');
const { remark } = require('remark');
const remarkBreaks = require('remark-breaks');
const remarkDisableTokenizers = require('remark-disable-tokenizers');
const remarkFrontmatter = require('remark-frontmatter');
const remarkMdx = require('remark-mdx');
const remarkParse = require('remark-parse');
const remarkRehype = require('remark-rehype');
const remarkSlug = require('remark-slug');
const remarkStringify = require('remark-stringify');
const unified = require('unified');
const { map: mapNodes } = require('unist-util-map');
const { selectAll } = require('unist-util-select');

const Components = require('./components');
const { getHref } = require('./components/Anchor');
const BaseUrlContext = require('./contexts/BaseUrl');
const createElement = require('./lib/createElement');
const CustomParsers = Object.values(require('./processor/parse'));
const customCompilers = Object.values(require('./processor/compile'));
const registerCustomComponents = require('./lib/registerCustomComponents');
const { options, parseOptions } = require('./options');
const { icons: calloutIcons } = require('./processor/parse/flavored/callout');
const toPlainText = require('./processor/plugin/plain-text');
const sectionAnchorId = require('./processor/plugin/section-anchor-id');
const tableFlattening = require('./processor/plugin/table-flattening');
const transformers = Object.values(require('./processor/transform'));
const createSchema = require('./sanitize.schema');

const {
  GlossaryItem,
  Code,
  Table,
  Anchor,
  Heading,
  Callout,
  CodeTabs,
  Image,
  Embed,
  HTMLBlock,
  Style,
  TableOfContents,
} = Components;

export { Components };

/**
 * Setup Options
 * !Normalize Magic Block Raw Text!
 */
export function setup(blocks, opts = {}) {
  // merge default and user options
  opts = parseOptions(opts);

  if (!opts.sanitize) {
    opts.sanitize = createSchema(opts);

    Object.values(Components).forEach(Component => Component.sanitize && Component.sanitize(opts.sanitize));
  }

  // normalize magic block linebreaks
  if (opts.normalize && blocks) {
    blocks = blocks.replace(/\[block:/g, '\n\n[block:').replace(/\[\/block\]/g, '[/block]\n');
  }

  return [`${blocks}\n\n `, opts];
}

export const utils = {
  get options() {
    return { ...options };
  },

  BaseUrlContext,
  getHref,
  GlossaryContext: GlossaryItem.GlossaryContext,
  VariablesContext: Variable.VariablesContext,
  calloutIcons,
};

/**
 * Core markdown to mdast processor
 */
export function processor(opts = {}) {
  [, opts] = setup('', opts);
  const { sanitize } = opts;

  return unified()
    .use(remarkParse, opts.markdownOptions)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .data('settings', opts.settings)
    .data('compatibilityMode', opts.compatibilityMode)
    .data('alwaysThrow', opts.alwaysThrow)
    .use(!opts.correctnewlines ? remarkBreaks : () => {})
    .use(CustomParsers.map(parser => parser.sanitize?.(sanitize) || parser))
    .use(transformers)
    .use(remarkSlug)
    .use(remarkDisableTokenizers, opts.disableTokenizers);
}

/**
 * Full markdown to html processor
 */
export function htmlProcessor(opts = {}) {
  [, opts] = setup('', opts);
  const { sanitize } = opts;

  /*
   * This is kinda complicated: "markdown" within ReadMe is
   * often more than just markdown. It can also include HTML,
   * as well as custom syntax constructs such as <<variables>>,
   * and other special features.
   *
   * We use the Unified text processor to parse and transform
   * Markdown to various output formats, such as a React component
   * tree. (See https://github.com/unifiedjs/unified for more.)
   *
   * The order for processing ReadMe-flavored markdown is as follows:
   * - parse markdown
   * - parse custom syntaxes add-ons using custom compilers
   * - convert from a remark mdast (markdown ast) to a rehype hast (hypertext ast)
   * - extract any raw HTML elements
   * - sanitize and remove any disallowed attributes
   * - output the hast to a React vdom with our custom components
   */
  return processor(opts).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw).use(rehypeSanitize, sanitize);
}

export function plain(text, opts = {}, components = {}) {
  if (!text) return null;
  [text, opts] = setup(text, opts);

  return htmlProcessor(opts)
    .use(rehypeReact, {
      createElement: React.createElement,
      Fragment: React.Fragment,
      components,
    })
    .processSync(text).contents;
}

/**
 *  return a React VDOM component tree
 */
// eslint-disable-next-line react/prop-types
const PinWrap = ({ children }) => <div className="pin">{children}</div>; // @todo: move this to it's own component

export function reactProcessor(opts = {}, components = {}) {
  [, opts] = setup('', opts);
  const { sanitize } = opts;

  return htmlProcessor({ ...opts })
    .use(sectionAnchorId)
    .use(rehypeReact, {
      createElement,
      Fragment: React.Fragment,
      components: {
        'code-tabs': CodeTabs(opts),
        'html-block': HTMLBlock(opts),
        'rdme-callout': Callout,
        'readme-variable': Variable,
        'readme-glossary-item': GlossaryItem,
        'rdme-embed': Embed(opts),
        'rdme-pin': PinWrap,
        table: Table,
        a: Anchor,
        h1: Heading(1, opts),
        h2: Heading(2, opts),
        h3: Heading(3, opts),
        h4: Heading(4, opts),
        h5: Heading(5, opts),
        h6: Heading(6, opts),
        code: Code(opts),
        img: Image(opts),
        style: Style(opts),
        ...registerCustomComponents(components, sanitize, opts.customComponentPrefix),
      },
    });
}

export function react(content, opts = {}, components = {}) {
  if (!content) return null;
  else if (typeof content === 'string') [content, opts] = setup(content, opts);
  else [, opts] = setup('', opts);

  const proc = reactProcessor(opts, components);
  if (typeof content === 'string') content = proc.parse(content);

  return proc.stringify(proc.runSync(content));
}

export const mdxReact = content => {
  const opts = {
    ...jsxRuntime,
    development: false,
  };

  try {
    return MDX.evaluateSync(content, opts).default;
  } catch (e) {
    return null;
  }
};

export const mdxast = (content, opts = {}) => {
  return remark().use(remarkMdx).parse(content, opts);
};

export const mdx = (ast, opts = {}) => {
  return remark().use(remarkMdx).stringify(ast, opts);
};

export function reactTOC(tree, opts = {}) {
  if (!tree) return null;
  [, opts] = setup('', opts);

  const proc = htmlProcessor(opts).use(rehypeReact, {
    createElement: React.createElement,
    components: {
      p: React.Fragment,
      'readme-variable': Variable,
      'readme-glossary-item': GlossaryItem,
    },
  });

  // Normalize Heading Levels
  const minLevel = selectAll('heading', tree).reduce((i, { depth }) => (!i || depth <= i ? depth : i), false); // determine "root" depth
  tree = mapNodes(tree, n => {
    if (n.type === 'heading') n.depth -= minLevel - 1;
    return n;
  });

  const toc = generateTOC(tree, { maxDepth: 2 }).map;
  const ast = toc ? proc.stringify(proc.runSync(toc)) : false;

  return ast ? React.createElement(TableOfContents, {}, ast) : null;
}

/**
 *  transform markdown in to HTML
 */
export function html(text, opts = {}) {
  if (!text) return null;
  [text, opts] = setup(text, opts);

  return htmlProcessor(opts).use(rehypeStringify).processSync(text).contents;
}

/**
 *  convert markdown to an hast object
 */
export function hast(text, opts = {}) {
  if (!text) return null;
  [text, opts] = setup(text, opts);

  const rdmd = htmlProcessor(opts).use(tableFlattening);
  const node = rdmd.parse(text);
  return rdmd.runSync(node);
}

/**
 *  convert markdown to an mdast object
 */
export function mdast(text, opts = {}) {
  if (!text) return null;
  [text, opts] = setup(text, opts);

  const rdmd = processor(opts);
  return rdmd.runSync(rdmd.parse(text));
}

/**
 * Converts an AST node to plain text
 */
export function astToPlainText(node, opts = {}) {
  if (!node) return '';
  [, opts] = setup('', opts);

  return processor(opts).use(toPlainText).stringify(node);
}

/**
 *  compile mdast to ReadMe-flavored markdown
 */
export function md(tree, opts = {}) {
  if (!tree) return null;
  [, opts] = setup('', opts);

  return processor(opts).use(remarkStringify, opts.markdownOptions).use(customCompilers).stringify(tree);
}

const ReadMeMarkdown = (text, opts = {}) => react(text, opts);

export default ReadMeMarkdown;
