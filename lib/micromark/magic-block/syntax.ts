/**
 * Micromark extension for magic block syntax: [block:TYPE]JSON[/block]
 *
 * This tokenizer recognizes magic blocks at parse time, making them first-class
 * AST nodes that work correctly in all markdown contexts (lists, blockquotes, etc.)
 *
 * Note: This file uses the standard micromark state machine pattern where state
 * functions return other state functions by name. This requires disabling the
 * no-use-before-define rule.
 */
/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { asciiAlphanumeric, markdownLineEnding } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    magicBlock: 'magicBlock';
    magicBlockData: 'magicBlockData';
    magicBlockLineEnding: 'magicBlockLineEnding';
    magicBlockMarkerEnd: 'magicBlockMarkerEnd';
    magicBlockMarkerStart: 'magicBlockMarkerStart';
    magicBlockMarkerTypeEnd: 'magicBlockMarkerTypeEnd';
    magicBlockTrailing: 'magicBlockTrailing';
    magicBlockType: 'magicBlockType';
  }
}

/**
 * Known magic block types that the tokenizer will recognize.
 * Unknown types will not be tokenized as magic blocks.
 */
const KNOWN_BLOCK_TYPES = new Set([
  'code',
  'api-header',
  'image',
  'callout',
  'parameters',
  'table',
  'embed',
  'html',
  'recipe',
  'tutorial-tile',
]);

/**
 * Check if a character is valid for a magic block type identifier.
 * Types can contain alphanumeric characters and hyphens (e.g., "api-header", "tutorial-tile")
 */
function isTypeChar(code: Code): boolean {
  return asciiAlphanumeric(code) || code === codes.dash;
}

/**
 * Tracks JSON string parsing state for proper handling of brackets inside strings.
 */
interface JsonParserState {
  escapeNext: boolean;
  inString: boolean;
}

/**
 * Creates the opening marker state machine: [block:
 * Returns the first state function to start parsing.
 */
function createOpeningMarkerParser(effects: Effects, nok: State, onComplete: State): State {
  const expectB = (code: Code): State | undefined => {
    if (code !== codes.lowercaseB) return nok(code);
    effects.consume(code);
    return expectL;
  };

  const expectL = (code: Code): State | undefined => {
    if (code !== codes.lowercaseL) return nok(code);
    effects.consume(code);
    return expectO;
  };

  const expectO = (code: Code): State | undefined => {
    if (code !== codes.lowercaseO) return nok(code);
    effects.consume(code);
    return expectC;
  };

  const expectC = (code: Code): State | undefined => {
    if (code !== codes.lowercaseC) return nok(code);
    effects.consume(code);
    return expectK;
  };

  const expectK = (code: Code): State | undefined => {
    if (code !== codes.lowercaseK) return nok(code);
    effects.consume(code);
    return expectColon;
  };

  const expectColon = (code: Code): State | undefined => {
    if (code !== codes.colon) return nok(code);
    effects.consume(code);
    effects.exit('magicBlockMarkerStart');
    effects.enter('magicBlockType');
    return onComplete;
  };

  return expectB;
}

/**
 * Creates the type capture state machine.
 * Captures type characters until ] and validates against known types.
 */
function createTypeCaptureParser(
  effects: Effects,
  nok: State,
  onComplete: State,
  blockTypeRef: { value: string },
): { first: State; remaining: State } {
  const captureTypeFirst = (code: Code): State | undefined => {
    // Reject empty type name [block:]
    if (code === codes.rightSquareBracket) {
      return nok(code);
    }

    if (isTypeChar(code)) {
      blockTypeRef.value += String.fromCharCode(code as number);
      effects.consume(code);
      return captureType;
    }

    return nok(code);
  };

  const captureType = (code: Code): State | undefined => {
    if (code === codes.rightSquareBracket) {
      if (!KNOWN_BLOCK_TYPES.has(blockTypeRef.value)) {
        return nok(code);
      }
      effects.exit('magicBlockType');
      effects.enter('magicBlockMarkerTypeEnd');
      effects.consume(code);
      effects.exit('magicBlockMarkerTypeEnd');
      return onComplete;
    }

    if (isTypeChar(code)) {
      blockTypeRef.value += String.fromCharCode(code as number);
      effects.consume(code);
      return captureType;
    }

    return nok(code);
  };

  return { first: captureTypeFirst, remaining: captureType };
}

/**
 * Creates the closing marker state machine: /block]
 * Handles partial matches by calling onMismatch to fall back to data capture.
 */
function createClosingMarkerParser(
  effects: Effects,
  onSuccess: State,
  onMismatch: (code: Code) => State | undefined,
  onEof: State,
  jsonState?: JsonParserState,
): { expectSlash: State } {
  const handleMismatch = (code: Code): State | undefined => {
    if (jsonState && code === codes.quotationMark) {
      jsonState.inString = true;
    }
    return onMismatch(code);
  };

  const expectSlash = (code: Code): State | undefined => {
    if (code === null) return onEof(code);
    if (code !== codes.slash) return handleMismatch(code);
    effects.consume(code);
    return expectB;
  };

  const expectB = (code: Code): State | undefined => {
    if (code === null) return onEof(code);
    if (code !== codes.lowercaseB) return handleMismatch(code);
    effects.consume(code);
    return expectL;
  };

  const expectL = (code: Code): State | undefined => {
    if (code === null) return onEof(code);
    if (code !== codes.lowercaseL) return handleMismatch(code);
    effects.consume(code);
    return expectO;
  };

  const expectO = (code: Code): State | undefined => {
    if (code === null) return onEof(code);
    if (code !== codes.lowercaseO) return handleMismatch(code);
    effects.consume(code);
    return expectC;
  };

  const expectC = (code: Code): State | undefined => {
    if (code === null) return onEof(code);
    if (code !== codes.lowercaseC) return handleMismatch(code);
    effects.consume(code);
    return expectK;
  };

  const expectK = (code: Code): State | undefined => {
    if (code === null) return onEof(code);
    if (code !== codes.lowercaseK) return handleMismatch(code);
    effects.consume(code);
    return expectBracket;
  };

  const expectBracket = (code: Code): State | undefined => {
    if (code === null) return onEof(code);
    if (code !== codes.rightSquareBracket) return handleMismatch(code);
    effects.consume(code);
    return onSuccess;
  };

  return { expectSlash };
}

/**
 * Partial construct for checking non-lazy continuation.
 * This is used by the flow tokenizer to check if we can continue
 * parsing on the next line.
 */
const nonLazyContinuation: Construct = {
  partial: true,
  tokenize: tokenizeNonLazyContinuation,
};

/**
 * Tokenizer for non-lazy continuation checking.
 * Returns ok if the next line is non-lazy (can continue), nok if lazy.
 */
function tokenizeNonLazyContinuation(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  const lineStart = (code: Code): State | undefined => {
    // `this` here refers to the micromark parser
    // since we are just passing functions as references and not actually calling them
    // micromarks's internal parser will call this automatically with appropriate arguments
    return this.parser.lazy[this.now().line] ? nok(code) : ok(code);
  };

  const start = (code: Code): State | undefined => {
    if (code === null) {
      return nok(code);
    }

    if (!markdownLineEnding(code)) {
      return nok(code);
    }

    effects.enter('magicBlockLineEnding');
    effects.consume(code);
    effects.exit('magicBlockLineEnding');
    return lineStart;
  };

  return start;
}

/**
 * Create a micromark extension for magic block syntax.
 *
 * This extension handles both single-line and multiline magic blocks:
 * - Flow construct (concrete): Handles block-level multiline magic blocks at document level
 * - Text construct: Handles inline magic blocks in lists, paragraphs, etc.
 *
 * The flow construct is marked as "concrete" which prevents it from being
 * interrupted by container markers (like `>` for blockquotes or `-` for lists).
 */
export function magicBlock(): Extension {
  return {
    // Flow construct - handles block-level magic blocks at document root
    // Marked as concrete to prevent interruption by containers
    flow: {
      [codes.leftSquareBracket]: {
        name: 'magicBlock',
        concrete: true,
        tokenize: tokenizeMagicBlockFlow,
      },
    },
    // Text construct - handles magic blocks in inline contexts (lists, paragraphs)
    text: {
      [codes.leftSquareBracket]: {
        name: 'magicBlock',
        tokenize: tokenizeMagicBlockText,
      },
    },
  };
}

/**
 * Flow tokenizer for block-level magic blocks (multiline).
 * Uses the continuation checking pattern from code fences.
 */
function tokenizeMagicBlockFlow(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  // State for tracking JSON content
  const jsonState: JsonParserState = { escapeNext: false, inString: false };
  const blockTypeRef = { value: '' };
  let seenOpenBrace = false;

  // Create shared parsers for opening marker and type capture
  const typeParser = createTypeCaptureParser(effects, nok, beforeData, blockTypeRef);
  const openingMarkerParser = createOpeningMarkerParser(effects, nok, typeParser.first);

  return start;

  function start(code: Code): State | undefined {
    if (code !== codes.leftSquareBracket) return nok(code);

    effects.enter('magicBlock');
    effects.enter('magicBlockMarkerStart');
    effects.consume(code);
    return openingMarkerParser;
  }

  /**
   * State before data content - handles line endings or starts data capture.
   */
  function beforeData(code: Code): State | undefined {
    // EOF - magic block must be closed
    if (code === null) {
      effects.exit('magicBlock');
      return nok(code);
    }

    // Line ending before any data - check continuation
    if (markdownLineEnding(code)) {
      return effects.check(nonLazyContinuation, continuationOkBeforeData, after)(code);
    }

    // Check for closing marker directly (without entering data)
    // This handles cases like [block:type]\n{}\n\n[/block] where there are
    // newlines after the data object
    if (code === codes.leftSquareBracket) {
      effects.enter('magicBlockMarkerEnd');
      effects.consume(code);
      return expectSlashFromContinuation;
    }

    // If we've already seen the opening brace, just continue capturing data
    if (seenOpenBrace) {
      effects.enter('magicBlockData');
      return captureData(code);
    }

    // Skip whitespace (spaces/tabs) before the data - stay in beforeData
    // Don't enter magicBlockData token yet until we confirm there's a '{'
    if (code === codes.space || code === codes.horizontalTab) {
      return beforeDataWhitespace(code);
    }

    // Data must start with '{' for valid JSON
    if (code !== codes.leftCurlyBrace) {
      effects.exit('magicBlock');
      return nok(code);
    }

    // We have '{' - enter data token and start capturing
    seenOpenBrace = true;
    effects.enter('magicBlockData');
    return captureData(code);
  }

  /**
   * Consume whitespace before the data without creating a token.
   * Uses a temporary token to satisfy micromark's requirement.
   */
  function beforeDataWhitespace(code: Code): State | undefined {
    if (code === null) {
      effects.exit('magicBlock');
      return nok(code);
    }

    if (markdownLineEnding(code)) {
      return effects.check(nonLazyContinuation, continuationOkBeforeData, after)(code);
    }

    if (code === codes.space || code === codes.horizontalTab) {
      // We need to consume this but can't without a token - use magicBlockData
      // and track that we haven't seen '{' yet
      effects.enter('magicBlockData');
      effects.consume(code);
      return beforeDataWhitespaceContinue;
    }

    if (code === codes.leftCurlyBrace) {
      seenOpenBrace = true;
      effects.enter('magicBlockData');
      return captureData(code);
    }

    effects.exit('magicBlock');
    return nok(code);
  }

  /**
   * Continue consuming whitespace or validate the opening brace.
   */
  function beforeDataWhitespaceContinue(code: Code): State | undefined {
    if (code === null) {
      effects.exit('magicBlockData');
      effects.exit('magicBlock');
      return nok(code);
    }

    if (markdownLineEnding(code)) {
      effects.exit('magicBlockData');
      return effects.check(nonLazyContinuation, continuationOk, after)(code);
    }

    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return beforeDataWhitespaceContinue;
    }

    if (code === codes.leftCurlyBrace) {
      seenOpenBrace = true;
      return captureData(code);
    }

    effects.exit('magicBlockData');
    effects.exit('magicBlock');
    return nok(code);
  }

  /**
   * Continuation OK before we've entered data token.
   */
  function continuationOkBeforeData(code: Code): State | undefined {
    effects.enter('magicBlockLineEnding');
    effects.consume(code);
    effects.exit('magicBlockLineEnding');
    return beforeData; // Stay in beforeData state - don't enter magicBlockData yet
  }

  function captureData(code: Code): State | undefined {
    // EOF - magic block must be closed
    if (code === null) {
      effects.exit('magicBlockData');
      effects.exit('magicBlock');
      return nok(code);
    }

    // At line ending, check if we can continue on the next line
    if (markdownLineEnding(code)) {
      effects.exit('magicBlockData');
      return effects.check(nonLazyContinuation, continuationOk, after)(code);
    }

    if (jsonState.escapeNext) {
      jsonState.escapeNext = false;
      effects.consume(code);
      return captureData;
    }

    if (jsonState.inString) {
      if (code === codes.backslash) {
        jsonState.escapeNext = true;
        effects.consume(code);
        return captureData;
      }
      if (code === codes.quotationMark) {
        jsonState.inString = false;
      }
      effects.consume(code);
      return captureData;
    }

    if (code === codes.quotationMark) {
      jsonState.inString = true;
      effects.consume(code);
      return captureData;
    }

    if (code === codes.leftSquareBracket) {
      effects.exit('magicBlockData');
      effects.enter('magicBlockMarkerEnd');
      effects.consume(code);
      return expectSlash;
    }

    effects.consume(code);
    return captureData;
  }

  /**
   * Called when non-lazy continuation check passes - we can continue parsing.
   */
  function continuationOk(code: Code): State | undefined {
    // Consume the line ending
    effects.enter('magicBlockLineEnding');
    effects.consume(code);
    effects.exit('magicBlockLineEnding');
    return continuationStart;
  }

  /**
   * Start of continuation line - check for more line endings, closing marker, or start capturing data.
   */
  function continuationStart(code: Code): State | undefined {
    // Handle consecutive line endings
    if (code === null) {
      effects.exit('magicBlock');
      return nok(code);
    }

    if (markdownLineEnding(code)) {
      return effects.check(nonLazyContinuation, continuationOkBeforeData, after)(code);
    }

    // Check if this is the start of the closing marker [/block]
    // If so, handle it directly without entering magicBlockData
    if (code === codes.leftSquareBracket) {
      effects.enter('magicBlockMarkerEnd');
      effects.consume(code);
      return expectSlashFromContinuation;
    }

    effects.enter('magicBlockData');
    return captureData(code);
  }

  /**
   * Check for closing marker slash when coming from continuation.
   * If not a closing marker, create an empty data token and continue.
   */
  function expectSlashFromContinuation(code: Code): State | undefined {
    if (code === null) {
      effects.exit('magicBlockMarkerEnd');
      effects.exit('magicBlock');
      return nok(code);
    }

    if (markdownLineEnding(code)) {
      effects.exit('magicBlockMarkerEnd');
      return effects.check(nonLazyContinuation, continuationOkBeforeData, after)(code);
    }

    if (code === codes.slash) {
      effects.consume(code);
      return expectClosingB;
    }

    // Not a closing marker - this is data content
    // Exit marker and enter data
    effects.exit('magicBlockMarkerEnd');
    effects.enter('magicBlockData');
    // The [ was consumed by the marker, so we need to conceptually "have it" in our data
    // But since we already consumed it into the marker, we need a different approach
    // Re-classify: consume this character as data and continue
    if (code === codes.quotationMark) jsonState.inString = true;
    effects.consume(code);
    return captureData;
  }

  function expectSlash(code: Code): State | undefined {
    if (code === null) {
      effects.exit('magicBlockMarkerEnd');
      effects.exit('magicBlock');
      return nok(code);
    }

    // At line ending during marker parsing
    if (markdownLineEnding(code)) {
      effects.exit('magicBlockMarkerEnd');
      return effects.check(nonLazyContinuation, continuationOk, after)(code);
    }

    if (code !== codes.slash) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === codes.quotationMark) jsonState.inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingB;
  }

  function expectClosingB(code: Code): State | undefined {
    if (code === null) {
      effects.exit('magicBlockMarkerEnd');
      effects.exit('magicBlock');
      return nok(code);
    }
    if (code !== codes.lowercaseB) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === codes.quotationMark) jsonState.inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingL;
  }

  function expectClosingL(code: Code): State | undefined {
    if (code === null) {
      effects.exit('magicBlockMarkerEnd');
      effects.exit('magicBlock');
      return nok(code);
    }
    if (code !== codes.lowercaseL) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === codes.quotationMark) jsonState.inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingO;
  }

  function expectClosingO(code: Code): State | undefined {
    if (code === null) {
      effects.exit('magicBlockMarkerEnd');
      effects.exit('magicBlock');
      return nok(code);
    }
    if (code !== codes.lowercaseO) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === codes.quotationMark) jsonState.inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingC;
  }

  function expectClosingC(code: Code): State | undefined {
    if (code === null) {
      effects.exit('magicBlockMarkerEnd');
      effects.exit('magicBlock');
      return nok(code);
    }
    if (code !== codes.lowercaseC) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === codes.quotationMark) jsonState.inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingK;
  }

  function expectClosingK(code: Code): State | undefined {
    if (code === null) {
      effects.exit('magicBlockMarkerEnd');
      effects.exit('magicBlock');
      return nok(code);
    }
    if (code !== codes.lowercaseK) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === codes.quotationMark) jsonState.inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingBracket;
  }

  function expectClosingBracket(code: Code): State | undefined {
    if (code === null) {
      effects.exit('magicBlockMarkerEnd');
      effects.exit('magicBlock');
      return nok(code);
    }
    if (code !== codes.rightSquareBracket) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === codes.quotationMark) jsonState.inString = true;
      effects.consume(code);
      return captureData;
    }

    effects.consume(code);
    effects.exit('magicBlockMarkerEnd');
    // Check for trailing whitespace on the same line
    return consumeTrailing;
  }

  /**
   * Consume trailing whitespace (spaces/tabs) on the same line after [/block].
   * For concrete flow constructs, we must end at eol/eof or fail.
   * Trailing whitespace is consumed; other content causes nok (text tokenizer handles it).
   */
  function consumeTrailing(code: Code): State | undefined {
    // End of file - done
    if (code === null) {
      effects.exit('magicBlock');
      return ok(code);
    }

    // Line ending - done
    if (markdownLineEnding(code)) {
      effects.exit('magicBlock');
      return ok(code);
    }

    // Space or tab - consume as trailing whitespace
    if (code === codes.space || code === codes.horizontalTab) {
      effects.enter('magicBlockTrailing');
      effects.consume(code);
      return consumeTrailingContinue;
    }

    // Any other character - fail flow tokenizer, let text tokenizer handle it
    effects.exit('magicBlock');
    return nok(code);
  }

  /**
   * Continue consuming trailing whitespace.
   */
  function consumeTrailingContinue(code: Code): State | undefined {
    // End of file - done
    if (code === null) {
      effects.exit('magicBlockTrailing');
      effects.exit('magicBlock');
      return ok(code);
    }

    // Line ending - done
    if (markdownLineEnding(code)) {
      effects.exit('magicBlockTrailing');
      effects.exit('magicBlock');
      return ok(code);
    }

    // More space or tab - keep consuming
    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return consumeTrailingContinue;
    }

    // Non-whitespace after whitespace - fail flow tokenizer
    effects.exit('magicBlockTrailing');
    effects.exit('magicBlock');
    return nok(code);
  }

  /**
   * Called when we can't continue (lazy line or EOF) - exit the construct.
   */
  function after(code: Code): State | undefined {
    effects.exit('magicBlock');
    return nok(code);
  }
}

/**
 * Text tokenizer for single-line magic blocks only.
 * Used in inline contexts like list items and paragraphs.
 * Multiline blocks are handled by the flow tokenizer.
 */
function tokenizeMagicBlockText(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  // State for tracking JSON content
  const jsonState: JsonParserState = { escapeNext: false, inString: false };
  const blockTypeRef = { value: '' };
  let seenOpenBrace = false;

  // Create shared parsers for opening marker and type capture
  const typeParser = createTypeCaptureParser(effects, nok, beforeData, blockTypeRef);
  const openingMarkerParser = createOpeningMarkerParser(effects, nok, typeParser.first);

  // Success handler for closing marker - exits tokens and returns ok
  const closingSuccess = (code: Code): State | undefined => {
    effects.exit('magicBlockMarkerEnd');
    effects.exit('magicBlock');
    return ok(code);
  };

  // Mismatch handler - falls back to data capture
  const closingMismatch = (code: Code): State | undefined => {
    effects.exit('magicBlockMarkerEnd');
    effects.enter('magicBlockData');
    if (code === codes.quotationMark) jsonState.inString = true;
    effects.consume(code);
    return captureData;
  };

  // EOF handler
  const closingEof = (_code: Code): State | undefined => nok(_code);

  // Create closing marker parsers
  const closingFromBeforeData = createClosingMarkerParser(
    effects,
    closingSuccess,
    closingMismatch,
    closingEof,
    jsonState,
  );

  const closingFromData = createClosingMarkerParser(effects, closingSuccess, closingMismatch, closingEof, jsonState);

  return start;

  function start(code: Code): State | undefined {
    if (code !== codes.leftSquareBracket) return nok(code);

    effects.enter('magicBlock');
    effects.enter('magicBlockMarkerStart');
    effects.consume(code);
    return openingMarkerParser;
  }

  /**
   * State before data content - handles line endings before entering data token.
   * Whitespace before '{' is allowed.
   */
  function beforeData(code: Code): State | undefined {
    // Fail on EOF - magic block must be closed
    if (code === null) {
      return nok(code);
    }

    // Handle line endings before any data - consume them without entering data token
    if (markdownLineEnding(code)) {
      effects.enter('magicBlockLineEnding');
      effects.consume(code);
      effects.exit('magicBlockLineEnding');
      return beforeData;
    }

    // Check for closing marker directly (without entering data)
    if (code === codes.leftSquareBracket) {
      effects.enter('magicBlockMarkerEnd');
      effects.consume(code);
      return closingFromBeforeData.expectSlash;
    }

    // If we've already seen the opening brace, just continue capturing data
    if (seenOpenBrace) {
      effects.enter('magicBlockData');
      return captureData(code);
    }

    // Skip whitespace (spaces/tabs) before the data
    if (code === codes.space || code === codes.horizontalTab) {
      return beforeDataWhitespace(code);
    }

    // Data must start with '{' for valid JSON
    if (code !== codes.leftCurlyBrace) {
      return nok(code);
    }

    // We have '{' - enter data token and start capturing
    seenOpenBrace = true;
    effects.enter('magicBlockData');
    return captureData(code);
  }

  /**
   * Consume whitespace before the data.
   */
  function beforeDataWhitespace(code: Code): State | undefined {
    if (code === null) {
      return nok(code);
    }

    if (markdownLineEnding(code)) {
      effects.enter('magicBlockLineEnding');
      effects.consume(code);
      effects.exit('magicBlockLineEnding');
      return beforeData;
    }

    if (code === codes.space || code === codes.horizontalTab) {
      effects.enter('magicBlockData');
      effects.consume(code);
      return beforeDataWhitespaceContinue;
    }

    if (code === codes.leftCurlyBrace) {
      seenOpenBrace = true;
      effects.enter('magicBlockData');
      return captureData(code);
    }

    return nok(code);
  }

  /**
   * Continue consuming whitespace or validate the opening brace.
   */
  function beforeDataWhitespaceContinue(code: Code): State | undefined {
    if (code === null) {
      effects.exit('magicBlockData');
      return nok(code);
    }

    if (markdownLineEnding(code)) {
      effects.exit('magicBlockData');
      effects.enter('magicBlockLineEnding');
      effects.consume(code);
      effects.exit('magicBlockLineEnding');
      return beforeData;
    }

    if (code === codes.space || code === codes.horizontalTab) {
      effects.consume(code);
      return beforeDataWhitespaceContinue;
    }

    if (code === codes.leftCurlyBrace) {
      seenOpenBrace = true;
      return captureData(code);
    }

    effects.exit('magicBlockData');
    return nok(code);
  }

  function captureData(code: Code): State | undefined {
    // Fail on EOF - magic block must be closed
    if (code === null) {
      effects.exit('magicBlockData');
      return nok(code);
    }

    // Handle multiline magic blocks within text/paragraphs
    // Exit data, consume line ending with proper token, then re-enter data
    if (markdownLineEnding(code)) {
      effects.exit('magicBlockData');
      effects.enter('magicBlockLineEnding');
      effects.consume(code);
      effects.exit('magicBlockLineEnding');
      return beforeData; // Go back to beforeData to handle potential empty lines
    }

    if (jsonState.escapeNext) {
      jsonState.escapeNext = false;
      effects.consume(code);
      return captureData;
    }

    if (jsonState.inString) {
      if (code === codes.backslash) {
        jsonState.escapeNext = true;
        effects.consume(code);
        return captureData;
      }
      if (code === codes.quotationMark) {
        jsonState.inString = false;
      }
      effects.consume(code);
      return captureData;
    }

    if (code === codes.quotationMark) {
      jsonState.inString = true;
      effects.consume(code);
      return captureData;
    }

    if (code === codes.leftSquareBracket) {
      effects.exit('magicBlockData');
      effects.enter('magicBlockMarkerEnd');
      effects.consume(code);
      return closingFromData.expectSlash;
    }

    effects.consume(code);
    return captureData;
  }
}

export default magicBlock;
