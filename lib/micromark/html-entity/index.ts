/**
 * Micromark extension for HTML entities without semicolons (e.g. `&nbsp`, `&amp`, `&copy`).
 *
 * Converts any valid named HTML entity written without a trailing semicolon into
 * its Unicode equivalent. Entities that already include the semicolon are left
 * for the standard parser to handle.
 */
export { htmlEntity, htmlEntityFromMarkdown } from './syntax';
