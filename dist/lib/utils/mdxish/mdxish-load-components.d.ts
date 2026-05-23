import type { CustomComponents } from '../../../types';
/**
 * Load components from the components directory and wrap them in RMDXModule format
 * Similar to prototype.js getAvailableComponents, but for React components instead of MDX files
 * This allows mix to use React components directly without MDX compilation
 */
export declare function loadComponents(): CustomComponents;
