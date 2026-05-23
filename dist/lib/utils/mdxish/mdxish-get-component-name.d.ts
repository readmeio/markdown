import type { CustomComponents } from '../../../types';
/**
 * Find a component in the components hash using case-insensitive matching.
 * Returns the actual key from the map, or null if not found.
 *
 * Matching priority:
 * 1. Exact match
 * 2. PascalCase version
 * 3. Case-insensitive match
 */
export declare function getComponentName(componentName: string, components: CustomComponents): string | null;
