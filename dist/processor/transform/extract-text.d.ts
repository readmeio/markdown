/**
 * Extracts text content from a single AST node recursively.
 * Works with both MDAST and HAST-like node structures.
 *
 * Placed this outside of the utils.ts file to avoid circular dependencies.
 *
 * @param node - The node to extract text from (can be MDAST Node or HAST-like structure)
 * @returns The concatenated text content
 */
export declare const extractText: (node: {
    alt?: unknown;
    children?: unknown[];
    type?: string;
    value?: unknown;
}) => string;
