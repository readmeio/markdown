import type { Node, RootContent } from 'mdast';
import type { Point, Position } from 'unist';
import type { VFile } from 'vfile';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { footnoteLabels } from '../../../lib/micromark/footnote-labels';
import { FEATURES, mdxishExtensions } from '../../../lib/micromark/mdxish-extensions';

/** A node whose `value` is text from the document, e.g. an html node; its position indexes into the document. */
interface ValueNode {
  position?: Position;
  value: string;
}

export interface MarkdownFragment {
  /** Where `rawText` starts in `parentNode.value`. */
  offsetInParentNode: number;
  /** The node the fragment was cut from. */
  parentNode: ValueNode;
  /** The fragment as it appears in `parentNode.value`. */
  rawText: string;
}

interface DocumentRange {
  end: Point & { offset: number };
  start: Point & { offset: number };
}

interface AlignedLine {
  /** Offset of the line's first non-whitespace character in the derived text. */
  derivedContentStart: number;
  derivedLineStart: number;
  /** Where that character sits in the document; unset when the line isn't found there. */
  documentContentStart?: Point & { offset: number };
  documentLineEnd?: number;
  documentLineStart?: number;
}

// Source lines a derived line can skip: blank, or only blockquote markers left by a blank line.
const CONTENTLESS_LINE_RE = /^[\s>]*$/;

// Markdown ends a line at `\r\n`, `\r` or `\n`.
const LINE_ENDING_RE = /\r\n|\r|\n/g;

export interface FragmentParseOptions {
  /** The page the fragment was cut from; positions are mapped onto it. */
  documentSource: string;
  // Footnotes the document defines, so `[^a]` in the fragment still links.
  footnotes?: readonly string[];
  // Phrasing only, so the fragment always comes back as one paragraph. Without it an inline
  // body like `[a]: https://b.com` parses as a link definition and renders nothing.
  phrasing?: boolean;
  safeMode?: boolean;
}

type ProcessorOptions = Omit<FragmentParseOptions, 'documentSource'>;

const buildComponentBodyProcessor = ({ footnotes = [], phrasing = false, safeMode = false }: ProcessorOptions) => {
  const { micromarkExtensions, fromMarkdownExtensions } = mdxishExtensions(FEATURES.componentBody, {
    phrasing,
    safeMode,
  });
  if (footnotes.length) micromarkExtensions.push(footnoteLabels(footnotes));

  return unified()
    .data('micromarkExtensions', micromarkExtensions)
    .data('fromMarkdownExtensions', fromMarkdownExtensions)
    .use(remarkParse)
    .use(remarkGfm);
};

type ComponentBodyProcessor = ReturnType<typeof buildComponentBodyProcessor>;

const componentBodyProcessors = new Map<string, ComponentBodyProcessor>();

// Footnotes differ per document, so only the latest set is kept: one page's bodies reuse it, and it can't grow.
let footnoteProcessor: { key: string; processor: ComponentBodyProcessor } | undefined;

/**
 * Memoized per option set, so the construction cost isn't paid on every parse.
 * The key covers every option, so a new option has to join it.
 */
const getComponentBodyProcessor = (options: ProcessorOptions) => {
  const key = `${!!options.phrasing}:${!!options.safeMode}`;
  if (options.footnotes?.length) {
    const footnoteKey = `${key}:${options.footnotes.join('\n')}`;
    if (footnoteProcessor?.key !== footnoteKey) {
      footnoteProcessor = { key: footnoteKey, processor: buildComponentBodyProcessor(options) };
    }
    return footnoteProcessor.processor;
  }
  let processor = componentBodyProcessors.get(key);
  if (!processor) {
    processor = buildComponentBodyProcessor(options);
    componentBodyProcessors.set(key, processor);
  }
  return processor;
};

const toDocumentRange = (position: Position | undefined): DocumentRange | undefined => {
  const { start, end } = position ?? {};
  if (start?.offset === undefined || end?.offset === undefined) return undefined;
  return { start: { ...start, offset: start.offset }, end: { ...end, offset: end.offset } };
};

/** Each line of `text` with the offset it starts at. */
const splitLines = (text: string) => {
  const lines: { start: number; text: string }[] = [];
  let start = 0;
  [...text.matchAll(LINE_ENDING_RE)].forEach(({ 0: ending, index }) => {
    lines.push({ start, text: text.slice(start, index) });
    start = index + ending.length;
  });
  lines.push({ start, text: text.slice(start) });
  return lines;
};

/**
 * Pairs each derived line with the document line it came from, in order. Reshaping only
 * strips indent or container prefixes and adds/drops blank lines, so a line's content
 * always ends the document line it came from.
 */
const alignLines = (derivedText: string, documentSource: string, range: DocumentRange): AlignedLine[] => {
  const documentLines = splitLines(documentSource.slice(range.start.offset, range.end.offset));
  let documentLineIndex = 0;

  const findDocumentLine = (content: string) => {
    while (documentLineIndex < documentLines.length) {
      const { start, text } = documentLines[documentLineIndex];
      const lineStart = range.start.offset + start;
      const line = range.start.line + documentLineIndex;
      const column = documentLineIndex === 0 ? range.start.column : 1;
      documentLineIndex += 1;

      const trimmed = text.trimEnd();
      if (trimmed.endsWith(content)) {
        const contentIndex = trimmed.length - content.length;
        return {
          documentContentStart: { line, column: column + contentIndex, offset: lineStart + contentIndex },
          documentLineEnd: lineStart + text.length,
          documentLineStart: lineStart,
        };
      }
      if (!CONTENTLESS_LINE_RE.test(text)) return {};
    }
    return {};
  };

  return splitLines(derivedText).map(({ start: derivedLineStart, text }) => {
    const content = text.trim();
    return {
      derivedLineStart,
      derivedContentStart: derivedLineStart + text.indexOf(content),
      ...(content ? findDocumentLine(content) : {}),
    };
  });
};

/** Maps an offset in the derived text to a document point; undefined when its line wasn't found. */
const createDerivedToDocumentMapper = (derivedText: string, documentSource: string, range: DocumentRange) => {
  const lines = alignLines(derivedText, documentSource, range);

  return (derivedOffset: number): Point | undefined => {
    let low = 0;
    let high = lines.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (lines[mid].derivedLineStart <= derivedOffset) low = mid;
      else high = mid - 1;
    }
    const { derivedContentStart, documentContentStart, documentLineStart = 0, documentLineEnd = 0 } = lines[low];
    if (!documentContentStart) return undefined;

    const unclampedOffset = documentContentStart.offset + derivedOffset - derivedContentStart;
    const offset = Math.min(Math.max(unclampedOffset, documentLineStart), documentLineEnd);
    return {
      line: documentContentStart.line,
      column: documentContentStart.column + offset - documentContentStart.offset,
      offset,
    };
  };
};

/**
 * Maps a `from`–`to` range of `node.value` onto the document; the node's whole range when either
 * end's line isn't found there. Null when the node has no position to map onto.
 */
export const createNodeValueToDocumentMapper = (node: ValueNode, documentSource: string) => {
  const nodeRange = toDocumentRange(node.position);
  if (!nodeRange) return null;
  const toDocumentPoint = createDerivedToDocumentMapper(node.value, documentSource, nodeRange);

  return (from: number, to: number): Position => {
    const start = toDocumentPoint(from);
    const end = toDocumentPoint(to);
    return start && end ? { start, end } : { start: { ...nodeRange.start }, end: { ...nodeRange.end } };
  };
};

/** Where `fragment.rawText` sits in the document; the parent's whole range when that can't be pinned down. */
const findFragmentRange = ({ parentNode, offsetInParentNode, rawText }: MarkdownFragment, documentSource: string) =>
  createNodeValueToDocumentMapper(parentNode, documentSource)?.(
    offsetInParentNode,
    offsetInParentNode + rawText.length,
  );

/**
 * Moves the positions of nodes parsed from `textToParse` (the fragment's raw text after any
 * deindent / trim) onto the document. Nodes whose text isn't verbatim there take the
 * fragment's range; without a parent position there's nothing to map onto, so they lose theirs.
 */
export const mapReparsedPositionsToDocument = (
  reparsedNodes: Node[],
  fragment: MarkdownFragment,
  textToParse: string,
  documentSource: string,
) => {
  const reparsedText = { position: findFragmentRange(fragment, documentSource), value: textToParse };
  const toDocumentPosition = createNodeValueToDocumentMapper(reparsedText, documentSource);

  reparsedNodes.forEach(reparsedNode =>
    visit(reparsedNode, node => {
      if (!node.position) return;
      if (!toDocumentPosition) {
        delete node.position;
        return;
      }
      node.position = toDocumentPosition(node.position.start.offset ?? 0, node.position.end.offset ?? 0);
    }),
  );
};

/**
 * Parses a component body's markdown with the component-body tokenizers, returning
 * children already positioned in the document.
 */
export const reparseMarkdownFragment = (
  fragment: MarkdownFragment,
  textToParse: string,
  { documentSource, ...processorOptions }: FragmentParseOptions,
): RootContent[] => {
  const { children } = getComponentBodyProcessor(processorOptions).parse(textToParse);
  mapReparsedPositionsToDocument(children, fragment, textToParse, documentSource);
  return children;
};

/**
 * The page a transformer maps re-parsed positions onto. Without it every re-parsed node falls
 * back to its parent's whole range, so warn: the caller ran the processor without the source.
 */
export const getDocumentSource = (file: VFile): string => {
  if (file.value === undefined) {
    // eslint-disable-next-line no-console
    console.warn("[mdxish] The VFile has no source, so re-parsed nodes get their parent's range. Pass it to `run()`.");
    return '';
  }
  return String(file.value);
};
