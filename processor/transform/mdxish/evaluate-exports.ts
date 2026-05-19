import type { Declaration, Program } from 'estree';
import type { Root } from 'mdast';
import type { MdxjsEsm } from 'mdast-util-mdx';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

import { buildJsx } from 'estree-util-build-jsx';
import { toJs } from 'estree-util-to-js';
import React from 'react';
import { visit } from 'unist-util-visit';

import { evaluate, isMDXEsm } from '../../utils';

export interface MdxishScope {
  components: Record<string, ReturnType<typeof Function>>;
  values: Record<string, unknown>;
}

declare module 'vfile' {
  interface DataMap {
    mdxishScope?: MdxishScope;
  }
}

declare module 'hast' {
  interface RootData {
    mdxishScope?: MdxishScope;
  }
}

/**
 * Collect names introduced by an `export const/function/class` declaration
 */
const collectExportNames = (declaration: Declaration): string[] => {
  if (declaration.type === 'VariableDeclaration') {
    return declaration.declarations
      .map(dec => (dec.id.type === 'Identifier' ? dec.id.name : null))
      .filter((name): name is string => Boolean(name));
  }
  if ('id' in declaration && declaration.id?.type === 'Identifier') {
    return [declaration.id.name];
  }
  return [];
};

/**
 * Evaluate `export const/function` declarations introduced by mdxjsEsm nodes.
 *
 * Walks each mdxjsEsm node's estree to gather all export declarations while
 * stripping the `export` statements. Then, evaluates the declarations at once
 * in a single sandboxed Function, so later exports can reference earlier ones
 * and supporting forward declarations.
 *
 * Any evaluation error will be consumed, logged, and none of the expressions
 * using the exported declarations will be evaluated. This error handling
 * can be further improved to provide more detailed information, and potentially
 * not fail everything if some of the exports are not evaluatable.
 */
const evaluateExports: Plugin<[], Root> = () => (tree: Root, file: VFile) => {
  const programBody: Declaration[] = [];
  const exportNames: string[] = [];
  const jsxComponentNames = new Set<string>();
  const nodesToRemove: { index: number; parent: Root }[] = [];

  // Get all export declarations and strip the `export` statements
  visit(tree, isMDXEsm, (node: MdxjsEsm, index, parent) => {
    if (parent && typeof index === 'number') {
      nodesToRemove.push({ index, parent: parent as Root });
    }

    const estreeBody = node.data?.estree?.body;
    if (!estreeBody) return;

    // One mdxjsEsm node can contain multiple export declarations
    estreeBody.forEach(statement => {
      if (statement.type !== 'ExportNamedDeclaration' || !statement.declaration) return;
      const declaration = statement.declaration;
      const declaredNames = collectExportNames(declaration);
      programBody.push(declaration);
      exportNames.push(...declaredNames);

      // Only function declarations can be invoked as `<Component />`. Cheap
      // JSX sniff catches JSX anywhere in the function body.
      if (
        declaration.type === 'FunctionDeclaration' &&
        /"type":"JSX(Element|Fragment)"/.test(JSON.stringify(declaration))
      ) {
        declaredNames.forEach(n => jsxComponentNames.add(n));
      }
    });
  });

  // Remove the mdxjsEsm nodes from the tree
  nodesToRemove
    .sort((a, b) => b.index - a.index)
    .forEach(({ index, parent }) => parent.children.splice(index, 1));

  if (!exportNames.length) return tree;

  const scope: MdxishScope = { components: {}, values: {} };

  try {
    // Build the full program body from all export declarations
    const program: Program = { type: 'Program', sourceType: 'module', body: programBody };
    buildJsx(program, { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' });
    const { value: source } = toJs(program);

    // Evaluate and build on the expression source
    // Use react to compile JSX codes
    const evaluatedExports = evaluate(
      `(() => { ${source}\nreturn { ${exportNames.join(', ')} }; })()`,
      { React },
    ) as Record<string, unknown>;

    // Build the scope for later plugins & consumer to be aware of the exported declarations
    Object.entries(evaluatedExports).forEach(([name, value]) => {
      if (typeof value === 'function' && jsxComponentNames.has(name)) {
        scope.components[name] = value;
      } else {
        scope.values[name] = value;
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[WARNING] Failed to evaluate exported declarations:', error);
    // eslint-disable-next-line no-console
    console.warn('[WARNING] Falling back to not evaluating exported declarations.');
  }

  file.data.mdxishScope = scope;

  return tree;
};

export default evaluateExports;
