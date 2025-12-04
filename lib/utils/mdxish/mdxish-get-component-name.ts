import type { CustomComponents } from '../../../types';

/** Convert a string to PascalCase */
function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Find a component in the components hash using case-insensitive matching.
 * Returns the actual key from the map, or null if not found.
 *
 * Matching priority:
 * 1. Exact match
 * 2. PascalCase version
 * 3. Case-insensitive match
 */
export function getComponentName(componentName: string, components: CustomComponents): string | null {
  // 1. Try exact match
  if (componentName in components) return componentName;

  // 2. Try PascalCase version
  const pascalCase = toPascalCase(componentName);
  if (pascalCase in components) return pascalCase;

  // 3. Try case-insensitive match
  const lowerName = componentName.toLowerCase();
  const lowerPascal = pascalCase.toLowerCase();

  return (
    Object.keys(components).find(key => {
      const lowerKey = key.toLowerCase();
      return lowerKey === lowerName || lowerKey === lowerPascal;
    }) ?? null
  );
}
