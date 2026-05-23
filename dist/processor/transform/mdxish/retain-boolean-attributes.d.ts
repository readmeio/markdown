import type { Plugin } from 'unified';
/**
 * Preserves boolean properties when passed to rehypeRaw because
 * rehypeRaw converts boolean properties in nodes to strings (e.g. true -> ""),
 * which can change the truthiness of the property. Hence we need to preserve the boolean properties.
 */
declare const preserveBooleanProperties: Plugin;
declare const restoreBooleanProperties: Plugin;
export { preserveBooleanProperties, restoreBooleanProperties };
