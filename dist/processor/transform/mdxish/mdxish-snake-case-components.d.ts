export type SnakeCaseMapping = Record<string, string>;
export interface SnakeCasePreprocessResult {
    content: string;
    mapping: SnakeCaseMapping;
}
export interface ProcessSnakeCaseOptions {
    /**
     * Set of known component names
     * Used to filter which snake_case components to transform
    */
    knownComponents?: Set<string>;
}
/**
 * Replaces snake_case component names with valid HTML placeholders.
 * Required because remark-parse rejects tags with underscores.
 * Example: `<Snake_case />` → `<MDXishSnakeCase0 />`
 *
 * Code blocks and inline code are protected and will not be transformed.
 *
 * @param content - The markdown content to process
 * @param options - Options including knownComponents to filter by
 */
export declare function processSnakeCaseComponent(content: string, options?: ProcessSnakeCaseOptions): SnakeCasePreprocessResult;
/**
 * Restores placeholder name to original snake_case name.
 * Uses case-insensitive matching since HTML parsers normalize to lowercase.
 */
export declare function restoreSnakeCase(placeholderName: string, mapping: SnakeCaseMapping): string;
