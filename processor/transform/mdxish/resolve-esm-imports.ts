import type { ImportDeclaration } from 'estree';

import React from 'react';

// Maps library names to their module package
export type ModuleRegistry = Record<string, unknown>;

// We provide React as a default module so that components can use hooks
// and it's a common use case. Add other common libraries here.
export const defaultModuleRegistry: ModuleRegistry = { react: React };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// Get the value of a named export from a module
const getModuleExport = (module: unknown, importedName: string): unknown =>
  isRecord(module) && importedName in module ? module[importedName] : undefined;

/**
 * Turn `import` declarations into a flat map of binding → value.
 * 
 * A "binding" is a mapping of a local name to the value of it in the module exports
 * Example: `import { useState } from 'react'` yields `{ useState: React.useState }`.
 * 
 * Unsupported specifiers are skipped with a warning rather than throwing, so a
 * single unknown import can't break the rest of the document.
 */
export const collectImportValues = (
  importDeclarations: ImportDeclaration[],
  registry: ModuleRegistry = defaultModuleRegistry,
): Record<string, unknown> => {
  const importValues: Record<string, unknown> = {};

  importDeclarations.forEach(declaration => {
    const libraryName = declaration.source.value;
    if (typeof libraryName !== 'string') return;

    if (!(libraryName in registry)) {
      // eslint-disable-next-line no-console
      console.warn(`[WARNING] Cannot resolve import "${libraryName}"; it is not a supported library.`);
      return;
    }

    const module = registry[libraryName];

    declaration.specifiers.forEach(spec => {
      // Default (`import React`) and namespace (`import * as React`) both bind
      // the whole module under the local name.
      if (spec.type === 'ImportDefaultSpecifier' || spec.type === 'ImportNamespaceSpecifier') {
        importValues[spec.local.name] = module;
      } else if (spec.type === 'ImportSpecifier') {
        // Named imports (e.g. `import { useState } from 'react'`, useState is the import name)
        const importName = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value;
        if (typeof importName === 'string') {
          importValues[spec.local.name] = getModuleExport(module, importName);
        }
      }
    });
  });

  return importValues;
};
