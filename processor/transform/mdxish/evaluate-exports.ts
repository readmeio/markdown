import type { Declaration, Pattern, Program } from 'estree';
import type { Root } from 'mdast';
import type { MdxjsEsm } from 'mdast-util-mdx';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

import { buildJsx } from 'estree-util-build-jsx';
import { toJs } from 'estree-util-to-js';
import React from 'react';
import { visit } from 'unist-util-visit';

import { evaluate, isMDXEsm } from '../../utils';

export type MdxishScope = Record<string, unknown>;

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
 * Recursively extract all identifier names introduced by a binding pattern.
 * Handles destructuring (`{ a, b }`, `[x, y]`), rest elements (`...rest`),
 * and default values (`{ a = 1 }`).
 */
const namesFromPattern = (pattern: Pattern): string[] => {
  if (pattern.type === 'Identifier') return [pattern.name];
  if (pattern.type === 'ObjectPattern') {
    return pattern.properties.flatMap(prop =>
      prop.type === 'RestElement' ? namesFromPattern(prop.argument) : namesFromPattern(prop.value as Pattern),
    );
  }
  if (pattern.type === 'ArrayPattern') {
    return pattern.elements.flatMap(el => (el ? namesFromPattern(el) : []));
  }
  if (pattern.type === 'RestElement') return namesFromPattern(pattern.argument);
  if (pattern.type === 'AssignmentPattern') return namesFromPattern(pattern.left);
  return [];
};

/**
 * Collect names introduced by an `export const/function/class` declaration.
 */
const collectExportNames = (declaration: Declaration): string[] => {
  if (declaration.type === 'VariableDeclaration') {
    return declaration.declarations.flatMap(dec => namesFromPattern(dec.id));
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
 * stripping the `export` statements. All declarations are then evaluated in a
 * single sandboxed Function so that they can reference one another regardless
 * of source order. Every resulting binding lands in a flat scope record —
 * components, helpers, and plain values share the same map.
 *
 * Any evaluation error is consumed and logged. We don't throw because it's
 * against the spirit of this engine to be less permissive than MDX needs.
 */
const evaluateExports: Plugin<[], Root> = () => (tree: Root, file: VFile) => {
  const programBody: Declaration[] = [];
  const exportNames: string[] = [];
  const nodesToRemove: { index: number; parent: Root }[] = [];

  visit(tree, isMDXEsm, (node: MdxjsEsm, index, parent) => {
    if (parent && typeof index === 'number') {
      nodesToRemove.push({ index, parent: parent as Root });
    }

    const estreeBody = node.data?.estree?.body;
    if (!estreeBody) return;

    // One mdxjsEsm node can contain multiple export declarations.
    // `export default function Foo()` and `export default class Foo {}` are
    // handled the same as a named export — the inner declaration carries the
    // binding name
    estreeBody.forEach(statement => {
      let declaration: Declaration | null = null;
      if (statement.type === 'ExportNamedDeclaration' && statement.declaration) {
        declaration = statement.declaration;
      } else if (
        statement.type === 'ExportDefaultDeclaration' &&
        (statement.declaration.type === 'FunctionDeclaration' || statement.declaration.type === 'ClassDeclaration') &&
        statement.declaration.id
      ) {
        declaration = statement.declaration as Declaration;
      }
      if (!declaration) return;

      programBody.push(declaration);
      exportNames.push(...collectExportNames(declaration));
    });
  });

  // Remove the mdxjsEsm nodes from the tree
  nodesToRemove
    .sort((a, b) => b.index - a.index)
    .forEach(({ index, parent }) => parent.children.splice(index, 1));

  if (!exportNames.length) return tree;

  const scope: MdxishScope = {};

  // Evaluate the declarations together at once in a single sandboxed Function
  try {
    const program: Program = { type: 'Program', sourceType: 'module', body: programBody };
    buildJsx(program, { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' });
    const { value: source } = toJs(program);

    // Evaluate and build on the expression source
    // Use react to compile JSX codes
    const evaluatedExports = evaluate(
      `(() => { ${source}\nreturn { ${exportNames.join(', ')} }; })()`,
      { React },
    ) as Record<string, unknown>;

    Object.assign(scope, evaluatedExports);
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
