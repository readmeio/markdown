import type { CustomComponents, RMDXModule } from '../../types';

import React from 'react';

import * as Components from '../../components';

/**
 * Load components from the components directory and wrap them in RMDXModule format
 * Similar to prototype.js getAvailableComponents, but for React components instead of MDX files
 * This allows mdxish to use React components directly without MDX compilation
 */
export function loadComponents(): CustomComponents {
  const components: CustomComponents = {};

  // Iterate through all exported components from components/index.ts
  // This mirrors prototype.js approach of getting all available components
  Object.entries(Components).forEach(([name, Component]) => {
    // Skip non-component exports (React components are functions or objects)
    if (typeof Component !== 'function' && typeof Component !== 'object') {
      return;

    // Wrap the component in RMDXModule format
    // RMDXModule expects: { default: Component, Toc: null, toc: [] }
    // getComponent looks for mod.default, so we wrap each component
    const wrappedModule: RMDXModule = {
      default: Component as React.ComponentType,
      Toc: null,
      toc: [],
    } as RMDXModule;

    components[name] = wrappedModule;
  });

  return components;
}

