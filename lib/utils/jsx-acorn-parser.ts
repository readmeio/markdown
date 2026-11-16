import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';

/**
 * Single instance of acorn parser extended with `acorn-jsx`
 * to parse expressions containing JSX.
 *
 * Lives in its own dependency-free module because the micromark extension
 * registry needs it during module initialisation, and `processor/utils` sits in
 * an import cycle with the parsers that consume the registry.
 */
export const jsxAcornParser = Parser.extend(acornJsx());
