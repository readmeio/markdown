import type { CustomComponents } from '../../types';

/**
 * Helper to check if a component exists in the components hash
 * Returns the component name from the components hash or null if not found
 */
export function componentExists(componentName: string, components: CustomComponents): string | null {
  // Convert component name to match component keys (components are typically PascalCase)
  // Try both the original name and PascalCase version
  const pascalCase = componentName
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  if (componentName in components) {
    return componentName;
  }
  if (pascalCase in components) {
    return pascalCase;
  }

  let matchingKey = null;
  Object.keys(components).forEach((key) => {
    if (key.toLowerCase() === componentName.toLowerCase() || key.toLowerCase() === pascalCase.toLowerCase()) {
      matchingKey = key;
    }
  });
  return matchingKey;
}
