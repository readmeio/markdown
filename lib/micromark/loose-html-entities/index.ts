/**
 * Micromark extension for HTML entities without semicolons.
 *
 * Handles named entities (e.g. `&nbsp`, `&amp`, `&copy`), decimal numeric
 * references (e.g. `&#160`, `&#169`), and hex numeric references (e.g. `&#xa0`,
 * `&#xA0`). Entities that already include the semicolon are left for the
 * standard parser to handle.
 */
export { looseHtmlEntity, looseHtmlEntityFromMarkdown } from './syntax';
