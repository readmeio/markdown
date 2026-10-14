/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Root as HastRoot } from 'hast';
import type { Node, Root as MdastRoot, Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxFlowExpression, MdxjsEsm } from 'mdast-util-mdx';
import type {
  MdxJsxAttribute,
  MdxJsxAttributeValueExpression,
  MdxJsxAttributeValueExpressionData,
} from 'mdast-util-mdx-jsx';
import type { Point, Position } from 'unist';

import { decodeHTMLStrict } from 'entities';
import { CONTINUE, EXIT, visit } from 'unist-util-visit';

import mdast from '../lib/mdast';
import { jsxAcornParser } from '../lib/utils/jsx-acorn-parser';
import { evaluateLiteralExpression } from '../lib/utils/literal-expression';

export { jsxAcornParser };

/**
 * Evaluate a JavaScript expression source and return its value.
 *
 * Wrapping in parens lets object literals (`{color: 'red'}`) parse as
 * expressions. Pass `scope` to expose named bindings (e.g. values introduced
 * by an `export const`) to the expression; without it, only self-contained
 * literals resolve.
 *
 * > ☢️ **Danger**: this `eval`s JavaScript. Only call when safeMode is off —
 * > safeMode's contract is that expression syntax is never evaluated, and the
 * > pipeline guards against reaching this path by keeping attribute expressions
 * > as literal strings and skipping the expression transformer entirely.
 *
 * Throws on parse/runtime error; callers decide the fallback.
 */
export function evaluate(source: string, scope: Record<string, unknown> = {}) {
  const names = Object.keys(scope);
  const values = names.map(name => scope[name]);
  // eslint-disable-next-line no-new-func
  return new Function(...names, `return (${source})`)(...values);
}

interface AlignedLine {
  /** Where the derived line's trimmed content starts, in derived and source columns. */
  derivedContentColumn: number;
  derivedStart: number;
  sourceContentColumn: number;
  sourceLineIndex: number;
  sourceLineStart: number;
  /** Inserted lines have no source text, so every column clamps to the line start. */
  sourceMaxColumn: number;
}

const TRAILING_CARRIAGE_RETURN = /\r$/;
// Blank once its container prefix is gone, e.g. a lone `>` inside a blockquote.
const BLANK_SOURCE_LINE = /^[\s>]*$/;

/**
 * Pairs each line of `derived` with the `source` line it came from. Derived lines may lose
 * their container prefix or indent, and blank lines may be added or dropped; any other
 * difference (e.g. decoded entities) leaves that line and the rest unaligned.
 */
const alignLines = (derived: string, source: string) => {
  const sourceLines = source.split('\n');
  const aligned: AlignedLine[] = [];
  let sourceLineIndex = 0;
  let sourceLineStart = 0;
  let derivedStart = 0;
  const consumeSourceLine = () => {
    sourceLineStart += sourceLines[sourceLineIndex].length + 1;
    sourceLineIndex += 1;
  };

  const allAligned = derived.split('\n').every(line => {
    const content = line.trim();
    const isBlankSourceLine = () => BLANK_SOURCE_LINE.test(sourceLines[sourceLineIndex] ?? '');
    const holdsContent = () => sourceLines[sourceLineIndex].includes(content);
    if (content) {
      while (sourceLineIndex < sourceLines.length && isBlankSourceLine() && !holdsContent()) consumeSourceLine();
    }
    const sourceLine = sourceLines[sourceLineIndex];
    if (sourceLine === undefined || !sourceLine.includes(content)) return false;

    const inserted = !content && !isBlankSourceLine();
    aligned.push({
      derivedStart,
      derivedContentColumn: line.length - line.trimStart().length,
      sourceContentColumn: content ? sourceLine.lastIndexOf(content) : 0,
      sourceLineIndex,
      sourceLineStart,
      sourceMaxColumn: inserted ? 0 : sourceLine.replace(TRAILING_CARRIAGE_RETURN, '').length,
    });
    if (!inserted) consumeSourceLine();
    derivedStart += line.length + 1;
    return true;
  });
  // Derived offsets past the end of the last aligned line have no source counterpart.
  return { aligned, mappableUntil: allAligned ? derived.length : derivedStart - 1 };
};

/**
 * Maps offsets in `derived`, a copy of `source` re-shaped for a re-parse, to points in the
 * document, where `source` starts at `start`. Returns undefined past the last aligned line.
 */
export const createSourcePointMapper = (derived: string, source: string, start: Point) => {
  const { aligned: lines, mappableUntil } = alignLines(derived, source);
  const startOffset = start.offset ?? 0;

  return (derivedOffset: number): Point | undefined => {
    if (!lines.length || derivedOffset > mappableUntil) return undefined;
    // Binary search: a large table maps one point per node.
    let low = 0;
    let high = lines.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (lines[mid].derivedStart <= derivedOffset) low = mid;
      else high = mid - 1;
    }
    const line = lines[low];
    const derivedColumn = derivedOffset - line.derivedStart;
    const sourceColumn = Math.min(
      line.sourceMaxColumn,
      Math.max(0, line.sourceContentColumn + derivedColumn - line.derivedContentColumn),
    );
    return {
      line: start.line + line.sourceLineIndex,
      column: (line.sourceLineIndex === 0 ? start.column : 1) + sourceColumn,
      offset: startOffset + line.sourceLineStart + sourceColumn,
    };
  };
};

/**
 * Maps offsets in a node's `value` to points in `source`. Containers strip a prefix from every
 * continuation line of `value`, so a plain offset shift drifts by line (CX-4028).
 */
export const createValueToSourceMapper = (
  position: Position | undefined,
  value: string,
  source: string | null | undefined,
) => {
  if (position?.start.offset === undefined) return null;
  const sourceText = source ? source.slice(position.start.offset, position.end.offset) : value;
  return createSourcePointMapper(value, sourceText, position.start);
};

/**
 * Moves every position under `roots` from re-parse offsets onto the document. Nodes the mapper
 * can't place have no verbatim source, so they take the `enclosing` range.
 */
export const mapPositionsToSource = (
  roots: Node[],
  toSourcePoint: ((derivedOffset: number) => Point | undefined) | null,
  enclosing: Position | undefined,
) => {
  roots.forEach(root =>
    visit(root, node => {
      if (!node.position) return;
      const start = toSourcePoint?.(node.position.start.offset ?? 0);
      const end = toSourcePoint?.(node.position.end.offset ?? 0);
      node.position = start && end ? { start, end } : enclosing && structuredClone(enclosing);
    }),
  );
};

/** Maps `[from, to)` in a node's `value` to a document range, or undefined when it can't be placed. */
export const createValueRangeMapper = (
  position: Position | undefined,
  value: string,
  source: string | null | undefined,
) => {
  const toSourcePoint = createValueToSourceMapper(position, value, source);
  return (from: number, to: number): Position | undefined => {
    const start = toSourcePoint?.(from);
    const end = toSourcePoint?.(to);
    return start && end ? { start, end } : undefined;
  };
};

/**
 * Gives every node under `roots` the `enclosing` range. For nodes built from data with no
 * verbatim source (e.g. magic-block JSON), the block is the smallest range that produced them.
 */
export const assignEnclosingPosition = (roots: Node[], enclosing: Position | undefined) => {
  roots.forEach(root =>
    visit(root, node => {
      node.position = enclosing && structuredClone(enclosing);
    }),
  );
};

/** The range from the first node's start to the last node's end, as fresh points. */
export const spanOf = (nodes: Node[]): Position | undefined => {
  const start = nodes[0]?.position?.start;
  const end = nodes[nodes.length - 1]?.position?.end;
  return start && end ? { start: { ...start }, end: { ...end } } : undefined;
};

/**
 * Formats the hProperties of a node as a string, so they can be compiled back into JSX/MDX.
 * This currently sets all the values to a string since we process/compile the MDX on the fly
 * through the editor, and it'll throw errors over malformed JSX. TODO: fix this.
 *
 * @template T
 * @param {Node} node
 * @returns {string} formatted hProperties as JSX attributes
 */
export const formatHProps = <T>(node: Node): string => {
  const hProps = getHProps<T>(node);
  return formatProps<T>(hProps);
};

/**
 * Formats an object of props as a string.
 *
 * @param {Object} props
 * @returns {string}
 */
export const formatProps = <T>(props: T): string => {
  const keys = Object.keys(props);
  return keys.map(key => `${key}="${props[key]}"`).join(' ');
};

/**
 * Returns the hProperties of a node.
 *
 * @template T
 * @param {Node} node
 * @returns {T} hProperties
 */
export const getHProps = <T>(node: Node): T => {
  const hProps = node.data?.hProperties || {};
  return hProps as T;
};

/**
 * Returns array of hProperty keys.
 *
 * @template T
 * @param {Node} node
 * @returns {Array} array of hProperty keys
 */
export const getHPropKeys = <T>(node: Node): string[] => {
  const hProps = getHProps<T>(node);
  return Object.keys(hProps) || [];
};

/**
 * Gets the attributes of an MDX element and returns them as an object of hProperties.
 *
 * @template T
 * @param {(MdxJsxFlowElement | MdxJsxTextElement)} jsx
 * @returns {T} object of hProperties
 */
export const getAttrs = <T>(jsx: MdxJsxFlowElement | MdxJsxTextElement): T =>
  jsx.attributes.reduce((memo, attr) => {
    if ('name' in attr) {
      if (attr.value === null) {
        memo[attr.name] = true;
      } else if (typeof attr.value === 'string') {
        memo[attr.name] = decodeHTMLStrict(attr.value);
      } else if (attr.value?.value !== undefined) {
        // Expression values only survive to here when safeMode is off; `flattenAttributeExpressions`
        // rewrites them to plain strings at the head of the pipeline otherwise.
        try {
          memo[attr.name] = evaluateLiteralExpression(attr.value.value);
        } catch {
          memo[attr.name] = attr.value.value;
        }
      }
    }

    return memo;
  }, {} as T);

/**
 * Gets the children of an MDX element and returns them as an array of Text nodes.
 * Currently only being used by the HTML Block component, which only expects a single text node.
 *
 * @template T
 * @param {(MdxJsxFlowElement | MdxJsxTextElement)} jsx
 * @returns {Array} array of child text nodes
 */
export const getChildren = <T>(jsx: MdxJsxFlowElement | MdxJsxTextElement): T =>
  jsx.children.reduce((memo, child: MdxFlowExpression, i) => {
    memo[i] = {
      type: 'text',
      value: child.value,
      position: child.position,
    };
    return memo;
  }, [] as T);

/**
 * Tests if a node is an MDX element.
 * TODO: Make this more extensible to all types of nodes. isElement(node, 'type' or ['type1', 'type2']), say
 *
 * @param {Node} node
 * @returns {(node is MdxJsxFlowElement | MdxJsxTextElement | MdxjsEsm)}
 */
export const isMDXElement = (node: Node): node is MdxJsxFlowElement | MdxJsxTextElement => {
  return ['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type);
};

/**
 * Tests if a node is an MDX ESM element (i.e. import or export).
 *
 * @param {Node} node
 * @returns {boolean}
 */
export const isMDXEsm = (node: Node): node is MdxjsEsm => {
  return node.type === 'mdxjsEsm';
};

/**
 * Takes an HTML string and formats it for display in the editor. Removes leading/trailing newlines
 * and unindents the HTML.
 *
 * @param {string} html - cooked HTML payload (callers strip any template-literal backticks first)
 * @param {number} [openingTagIndent=0] - column the `<HTMLBlock>` opening tag sits at, used to
 *   dedent each content line so its indentation reads relative to the tag, not the line start
 * @returns {string} processed HTML
 */
export function formatHtmlForMdxish(html: string, openingTagIndent = 0): string {
  // Removes the leading/trailing newlines
  let cleaned = html.replace(/^\s*\n|\n\s*$/g, '');

  // Strip / deindent the lines in the HTML string so that the indents are relative
  // to the opening HTMLBlock tag, not the literal line start
  // Keep any deeper indent
  if (openingTagIndent > 0) {
    cleaned = cleaned
      .split('\n')
      .map(line => {
        let i = 0;
        while (i < openingTagIndent && (line[i] === ' ' || line[i] === '\t')) i += 1;
        return line.slice(i);
      })
      .join('\n');
  }

  // Convert literal \n sequences to actual newlines only inside <pre> and <code>.
  // Because <pre> needs to respect the newline visual and
  // escape characters should be processed in the <code> tag.
  //
  // We don't want to unescape every \n because it might break the HTML & cause errors
  // Example: <script>console.log("\n");</script>
  // Would get turned into: <script>console.log("
  // ");</script>
  // which is invalid javascript and will cause error
  cleaned = cleaned.replace(
    /(<(pre|code)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi,
    (_m, open: string, _tag: string, inner: string, close: string) => open + inner.replace(/\\n/g, '\n') + close,
  );

  // Unescape backticks: \` -> ` (users escape backticks in template literals)
  // Handle both cases: \` (adjacent) and \ followed by ` (split by markdown parser)
  cleaned = cleaned.replace(/\\`/g, '`');

  // Also handle case where backslash and backtick got separated by markdown parsing
  // Pattern: backslash followed by any characters (but not \n which we already handled), then a backtick
  // This handles cases like: \example` -> `example` (replacing \ with ` at start)
  // Exclude \n sequences to avoid matching them incorrectly
  cleaned = cleaned.replace(/\\([^`\\n]*?)`/g, '`$1`');

  // Fix case where markdown parser consumed one backtick from triple backticks
  // Pattern: `` followed by a word (like ``javascript) should be ```javascript
  // This handles cases where code fences were parsed and one backtick was lost
  cleaned = cleaned.replace(/<(\w+[^>]*)>``(\w+)/g, '<$1>```$2');

  // Unescape dollar signs: \$ -> $ (users escape $ in template literals to prevent interpolation)
  cleaned = cleaned.replace(/\\\$/g, '$');

  return cleaned;
}

/**
 * Takes an HTML string and formats it for display in the editor. Removes leading/trailing newlines
 * and unindents the HTML.
 *
 * @param {string} html
 * @returns {string} formatted HTML
 */
export const formatHTML = (html: string): string => {
  // Remove leading/trailing backticks if present, since they're used to keep the HTML
  // from being parsed prematurely
  if (html.startsWith('`') && html.endsWith('`')) {
    // eslint-disable-next-line no-param-reassign
    html = html.slice(1, -1);
  }
  // Removes the leading/trailing newlines
  const cleaned = html.replace(/^\s*\n|\n\s*$/g, '');

  // // Get the number of spaces in the first line to determine the tab size
  // const tab = cleaned.match(/^\s*/)[0].length;

  // // Remove the first indentation level from each line
  // const tabRegex = new RegExp(`^\\s{${tab}}`, 'gm');
  // const unindented = cleaned.replace(tabRegex, '');

  return cleaned;
};

/**
 * Reformat HTML for the markdown/mdx by adding an indentation to each line. This assures that the
 * HTML is indentend properly within the HTMLBlock component when rendered in the markdown/mdx.
 *
 * @param {string} html
 * @param {number} [indent=2]
 * @returns {string} re-formatted HTML
 */
export const reformatHTML = (html: string): string => {
  // Remove leading/trailing newlines
  const cleaned = html.replace(/^\s*\n|\n\s*$/g, '').replaceAll(/(?<!\\(\\\\)*)`/g, '\\`');

  // // Create a tab/indent with the specified number of spaces
  // const tab = ' '.repeat(indent);

  // // Indent each line of the HTML (converts to an array, indents each line, then joins back)
  // const indented = cleaned.split('\n').map((line: string) => `${tab}${line}`).join('\n');

  return cleaned;
};

export const toAttributes = (object: Record<string, unknown>, keys: string[] = []): MdxJsxAttribute[] => {
  const attributes: MdxJsxAttribute[] = [];

  Object.entries(object).forEach(([name, v]) => {
    if (keys.length > 0 && !keys.includes(name)) return;

    let value: MdxJsxAttributeValueExpression | string;

    if (typeof v === 'undefined' || v === null || v === '' || v === false) {
      return;
    } else if (typeof v === 'string') {
      value = v;
    } else {
      /* values can be null, undefined, string, or a expression, eg:
       *
       * ```
       * <Image src="..." border={false} size={width - 20} />
       * ```
       *
       * Parsing the expression seems to only be done by the library
       * `mdast-util-mdx-jsx`, and so the most straight forward way to parse
       * the expression and get the appropriate AST is with our `mdast`
       * function.
       */
      const proxy = mdast(`{${v}}`);
      const data = proxy.children[0].data as MdxJsxAttributeValueExpressionData;

      value = {
        type: 'mdxJsxAttributeValueExpression',
        value: v.toString(),
        data,
      };
    }

    attributes.push({
      type: 'mdxJsxAttribute',
      name,
      value,
    });
  });

  return attributes;
};

/**
 * Checks if a named export exists in the MDX tree. Accepts either an mdast or
 * a hast tree.
 *
 * example:
 * ```
 * const mdx = `export const Foo = 'bar';`
 *
 * hasNamedExport(mdast(mdx), 'Foo') => true
 * ```
 *
 */
export const hasNamedExport = (tree: HastRoot | MdastRoot, name: string): boolean => {
  let hasExport = false;

  // eslint-disable-next-line consistent-return
  visit(tree, 'mdxjsEsm', node => {
    if (
      'declaration' in node.data.estree.body[0] &&
      node.data.estree.body[0].declaration.type === 'VariableDeclaration'
    ) {
      const { declarations } = node.data.estree.body[0].declaration;
      hasExport = !!declarations.find(declaration => 'name' in declaration.id && declaration.id.name === name);

      return hasExport ? EXIT : CONTINUE;
    }
  });

  return hasExport;
};

/* Example mdast structures to find first export name in a mdxjsEsm node:
There are three types of export declarations that we need to consider:
1. VARIABLE DECLARATION
      "type": "mdxjsEsm",
      "value": "export const Foo = () => <div>Hello world</div>\nexport const Bar = () => <div>hello darkness my old friend</div>",
      "data": {
        "estree": {
          "type": "Program",
          "body": [
            {
              "type": "ExportNamedDeclaration",
              "declaration": {
                "type": "VariableDeclaration",
                "declarations": [
                  {
                    "type": "VariableDeclarator",
                    "id": {
                      "type": "Identifier",
                      "name": "Foo" // --------> This is the export name
                    },
                    ...

2/3. FUNCTION DECLARATION & CLASS DECLARATION
      "estree": {
          "type": "Program",
          "body": [
            {
              "type": "ExportNamedDeclaration",
              "declaration": {
                "type": "ClassDeclaration" | "FunctionDeclaration",
                "id": {
                  "type": "Identifier",
                  "name": "Foo" // --------> This is the export name
                },
*/

export const getExports = (tree: Root) => {
  const set = new Set<string>();

  visit(tree, isMDXEsm, (node: MdxjsEsm) => {
    // Once inside an mdxjsEsm node, we need to check for one or more declared exports within data.estree.body
    // This is because single newlines \n are not considered as a new block, so there may be more than one export statement in a single mdxjsEsm node
    const body = node.data?.estree.body;
    if (!body) return;

    body.forEach(child => {
      if (child.type === 'ExportNamedDeclaration') {
        // There are three types of ExportNamedDeclaration that we need to consider: VariableDeclaration, FunctionDeclaration, ClassDeclaration
        const declaration = child.declaration;
        // FunctionDeclaration and ClassDeclaration have the same structure
        if (declaration.type !== 'VariableDeclaration') {
          // Note: declaration.id.type is always 'Identifier' for FunctionDeclarations and ClassDeclarations
          set.add(declaration.id.name);
        } else {
          declaration.declarations.forEach(dec => {
            const id = dec.id;

            if (id.type === 'Identifier') {
              set.add(id.name);
            }
          });
        }
      }
    });
  });

  return Array.from(set);
};
