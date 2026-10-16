import type { Node, RootContent } from 'mdast';
import type { Point, Position } from 'unist';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { FEATURES, mdxishExtensions } from '../../../lib/micromark/mdxish-extensions';

export interface MarkdownFragment {
  /** Where `rawText` starts in `parentNode.value`. */
  offsetInParentNode: number;
  /** The node the fragment was cut from; its position indexes into the document. */
  parentNode: { position?: Position; value: string };
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

const buildComponentBodyProcessor = (safeMode: boolean) => {
  const { micromarkExtensions, fromMarkdownExtensions } = mdxishExtensions(FEATURES.componentBody, { safeMode });
  return unified()
    .data('micromarkExtensions', micromarkExtensions)
    .data('fromMarkdownExtensions', fromMarkdownExtensions)
    .use(remarkParse)
    .use(remarkGfm);
};

const componentBodyProcessors = new Map<boolean, ReturnType<typeof buildComponentBodyProcessor>>();

const getComponentBodyProcessor = (safeMode: boolean) => {
  let processor = componentBodyProcessors.get(safeMode);
  if (!processor) {
    processor = buildComponentBodyProcessor(safeMode);
    componentBodyProcessors.set(safeMode, processor);
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

/** Where `fragment.rawText` sits in the document; the parent's whole range when that can't be pinned down. */
const findFragmentRange = (fragment: MarkdownFragment, documentSource: string): DocumentRange | undefined => {
  const { parentNode, offsetInParentNode, rawText } = fragment;
  const parentRange = toDocumentRange(parentNode.position);
  if (!parentRange) return undefined;

  const toDocumentPoint = createDerivedToDocumentMapper(parentNode.value, documentSource, parentRange);
  const start = toDocumentPoint(offsetInParentNode);
  const end = toDocumentPoint(offsetInParentNode + rawText.length);
  return toDocumentRange(start && end ? { start, end } : undefined) ?? parentRange;
};

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
  const fragmentRange = findFragmentRange(fragment, documentSource);
  const toDocumentPoint = fragmentRange && createDerivedToDocumentMapper(textToParse, documentSource, fragmentRange);

  reparsedNodes.forEach(reparsedNode =>
    visit(reparsedNode, node => {
      if (!node.position) return;
      if (!fragmentRange || !toDocumentPoint) {
        delete node.position;
        return;
      }
      const start = toDocumentPoint(node.position.start.offset ?? 0);
      const end = toDocumentPoint(node.position.end.offset ?? 0);
      node.position =
        start && end ? { start, end } : { start: { ...fragmentRange.start }, end: { ...fragmentRange.end } };
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
  { documentSource, safeMode = false }: { documentSource: string; safeMode?: boolean },
): RootContent[] => {
  const { children } = getComponentBodyProcessor(safeMode).parse(textToParse);
  mapReparsedPositionsToDocument(children, fragment, textToParse, documentSource);
  return children;
};
