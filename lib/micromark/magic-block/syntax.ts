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
import type {
  Code,
  Construct,
  Effects,
  Extension,
  State,
  TokenizeContext,
} from 'micromark-util-types';

// Character codes
const leftBracket = 91; // [
const rightBracket = 93; // ]
const slash = 47; // /
const backslash = 92; // \
const quoteMark = 34; // "

// "block:" as character codes
const charB = 98;
const charL = 108;
const charO = 111;
const charC = 99;
const charK = 107;
const charColon = 58;

// Line ending codes (from micromark-util-symbol)
const carriageReturn = -5;
const lineFeed = -4;
const carriageReturnLineFeed = -3;

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    magicBlock: 'magicBlock';
    magicBlockData: 'magicBlockData';
    magicBlockLineEnding: 'magicBlockLineEnding';
    magicBlockMarkerEnd: 'magicBlockMarkerEnd';
    magicBlockMarkerStart: 'magicBlockMarkerStart';
    magicBlockMarkerTypeEnd: 'magicBlockMarkerTypeEnd';
    magicBlockType: 'magicBlockType';
  }
}

/**
 * Check if a code is a line ending.
 */
function markdownLineEnding(code: Code): boolean {
  return code === carriageReturn || code === lineFeed || code === carriageReturnLineFeed;
}

/**
 * Check if a character is valid for a magic block type identifier.
 * Types can contain alphanumeric characters and hyphens (e.g., "api-header", "tutorial-tile")
 */
function isTypeChar(code: Code): boolean {
  if (code === null) return false;
  return (
    (code >= 97 && code <= 122) || // a-z
    (code >= 65 && code <= 90) || // A-Z
    (code >= 48 && code <= 57) || // 0-9
    code === 45 // hyphen
  );
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
function tokenizeNonLazyContinuation(
  this: TokenizeContext,
  effects: Effects,
  ok: State,
  nok: State,
): State {
  const lineStart = (code: Code): State | undefined => {
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
      [leftBracket]: {
        name: 'magicBlock',
        concrete: true,
        tokenize: tokenizeMagicBlockFlow,
      },
    },
    // Text construct - handles magic blocks in inline contexts (lists, paragraphs)
    text: {
      [leftBracket]: {
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
  let inString = false;
  let escapeNext = false;

  return start;

  function start(code: Code): State | undefined {
    if (code !== leftBracket) return nok(code);

    effects.enter('magicBlock');
    effects.enter('magicBlockMarkerStart');
    effects.consume(code);
    return expectB;
  }

  function expectB(code: Code): State | undefined {
    if (code !== charB) return nok(code);
    effects.consume(code);
    return expectL;
  }

  function expectL(code: Code): State | undefined {
    if (code !== charL) return nok(code);
    effects.consume(code);
    return expectO;
  }

  function expectO(code: Code): State | undefined {
    if (code !== charO) return nok(code);
    effects.consume(code);
    return expectC;
  }

  function expectC(code: Code): State | undefined {
    if (code !== charC) return nok(code);
    effects.consume(code);
    return expectK;
  }

  function expectK(code: Code): State | undefined {
    if (code !== charK) return nok(code);
    effects.consume(code);
    return expectColon;
  }

  function expectColon(code: Code): State | undefined {
    if (code !== charColon) return nok(code);
    effects.consume(code);
    effects.exit('magicBlockMarkerStart');
    effects.enter('magicBlockType');
    return captureType;
  }

  function captureType(code: Code): State | undefined {
    if (code === rightBracket) {
      effects.exit('magicBlockType');
      effects.enter('magicBlockMarkerTypeEnd');
      effects.consume(code);
      effects.exit('magicBlockMarkerTypeEnd');
      // Don't enter magicBlockData yet - wait to see if we have content
      return beforeData;
    }

    if (isTypeChar(code)) {
      effects.consume(code);
      return captureType;
    }

    return nok(code);
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

    // We have content - enter data token and start capturing
    effects.enter('magicBlockData');
    return captureData(code);
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

    if (escapeNext) {
      escapeNext = false;
      effects.consume(code);
      return captureData;
    }

    if (inString) {
      if (code === backslash) {
        escapeNext = true;
        effects.consume(code);
        return captureData;
      }
      if (code === quoteMark) {
        inString = false;
      }
      effects.consume(code);
      return captureData;
    }

    if (code === quoteMark) {
      inString = true;
      effects.consume(code);
      return captureData;
    }

    if (code === leftBracket) {
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
    if (code === leftBracket) {
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

    if (code === slash) {
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
    if (code === quoteMark) inString = true;
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

    if (code !== slash) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
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
    if (code !== charB) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
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
    if (code !== charL) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
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
    if (code !== charO) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
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
    if (code !== charC) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
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
    if (code !== charK) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
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
    if (code !== rightBracket) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }

    effects.consume(code);
    effects.exit('magicBlockMarkerEnd');
    effects.exit('magicBlock');
    return ok;
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
  let inString = false;
  let escapeNext = false;

  return start;

  function start(code: Code): State | undefined {
    if (code !== leftBracket) return nok(code);

    effects.enter('magicBlock');
    effects.enter('magicBlockMarkerStart');
    effects.consume(code);
    return expectB;
  }

  function expectB(code: Code): State | undefined {
    if (code !== charB) return nok(code);
    effects.consume(code);
    return expectL;
  }

  function expectL(code: Code): State | undefined {
    if (code !== charL) return nok(code);
    effects.consume(code);
    return expectO;
  }

  function expectO(code: Code): State | undefined {
    if (code !== charO) return nok(code);
    effects.consume(code);
    return expectC;
  }

  function expectC(code: Code): State | undefined {
    if (code !== charC) return nok(code);
    effects.consume(code);
    return expectK;
  }

  function expectK(code: Code): State | undefined {
    if (code !== charK) return nok(code);
    effects.consume(code);
    return expectColon;
  }

  function expectColon(code: Code): State | undefined {
    if (code !== charColon) return nok(code);
    effects.consume(code);
    effects.exit('magicBlockMarkerStart');
    effects.enter('magicBlockType');
    return captureType;
  }

  function captureType(code: Code): State | undefined {
    if (code === rightBracket) {
      effects.exit('magicBlockType');
      effects.enter('magicBlockMarkerTypeEnd');
      effects.consume(code);
      effects.exit('magicBlockMarkerTypeEnd');
      // Don't enter magicBlockData yet - wait to see if we have content
      return beforeData;
    }

    if (isTypeChar(code)) {
      effects.consume(code);
      return captureType;
    }

    return nok(code);
  }

  /**
   * State before data content - handles line endings before entering data token.
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
    if (code === leftBracket) {
      effects.enter('magicBlockMarkerEnd');
      effects.consume(code);
      return expectSlashFromBeforeData;
    }

    // We have content - enter data token and start capturing
    effects.enter('magicBlockData');
    return captureData(code);
  }

  /**
   * Check for slash in closing marker when coming from beforeData.
   */
  function expectSlashFromBeforeData(code: Code): State | undefined {
    if (code === null) return nok(code);

    if (code === slash) {
      effects.consume(code);
      return expectClosingBFromBeforeData;
    }

    // Not a closing marker - this is data content
    effects.exit('magicBlockMarkerEnd');
    effects.enter('magicBlockData');
    if (code === quoteMark) inString = true;
    effects.consume(code);
    return captureData;
  }

  function expectClosingBFromBeforeData(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== charB) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingLFromBeforeData;
  }

  function expectClosingLFromBeforeData(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== charL) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingOFromBeforeData;
  }

  function expectClosingOFromBeforeData(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== charO) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingCFromBeforeData;
  }

  function expectClosingCFromBeforeData(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== charC) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingKFromBeforeData;
  }

  function expectClosingKFromBeforeData(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== charK) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingBracketFromBeforeData;
  }

  function expectClosingBracketFromBeforeData(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== rightBracket) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }

    effects.consume(code);
    effects.exit('magicBlockMarkerEnd');
    effects.exit('magicBlock');
    return ok;
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

    if (escapeNext) {
      escapeNext = false;
      effects.consume(code);
      return captureData;
    }

    if (inString) {
      if (code === backslash) {
        escapeNext = true;
        effects.consume(code);
        return captureData;
      }
      if (code === quoteMark) {
        inString = false;
      }
      effects.consume(code);
      return captureData;
    }

    if (code === quoteMark) {
      inString = true;
      effects.consume(code);
      return captureData;
    }

    if (code === leftBracket) {
      effects.exit('magicBlockData');
      effects.enter('magicBlockMarkerEnd');
      effects.consume(code);
      return expectSlashText;
    }

    effects.consume(code);
    return captureData;
  }

  function expectSlashText(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== slash) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      // Handle quote to maintain string state
      if (code === quoteMark) {
        inString = true;
      }
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingBText;
  }

  function expectClosingBText(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== charB) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingLText;
  }

  function expectClosingLText(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== charL) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingOText;
  }

  function expectClosingOText(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== charO) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingCText;
  }

  function expectClosingCText(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== charC) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingKText;
  }

  function expectClosingKText(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== charK) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }
    effects.consume(code);
    return expectClosingBracketText;
  }

  function expectClosingBracketText(code: Code): State | undefined {
    if (code === null) return nok(code);
    if (code !== rightBracket) {
      effects.exit('magicBlockMarkerEnd');
      effects.enter('magicBlockData');
      if (code === quoteMark) inString = true;
      effects.consume(code);
      return captureData;
    }

    effects.consume(code);
    effects.exit('magicBlockMarkerEnd');
    effects.exit('magicBlock');
    return ok;
  }
}

export default magicBlock;
