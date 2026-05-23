import type { Transform } from 'mdast-util-from-markdown';
/**
 * Validates that MCPIntro components have a required url attribute.
 * Throws an error during compilation if the attribute is missing.
 */
declare const validateMCPIntro: () => Transform;
export default validateMCPIntro;
