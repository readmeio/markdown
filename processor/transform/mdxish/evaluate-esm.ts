import type { Declaration, Program } from 'estree';
import type { Root } from 'mdast';
import type { MdxjsEsm } from 'mdast-util-mdx';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

import { buildJsx } from 'estree-util-build-jsx';
import { toJs } from 'estree-util-to-js';
import React from 'react';
import { visit } from 'unist-util-visit';

import { isMDXEsm } from '../../utils';

export interface MdxishScope {
  components: Record<string, unknown>;
  values: Record<string, unknown>;
}

declare module 'vfile' {
  interface DataMap {
    mdxishScope?: MdxishScope;
  }
}

/**
 * Collect names introduced by an `export const/function/class` declaration.
 * Mirrors the structure documented in `getExports` (see processor/utils.ts).
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
 * Walks each mdxjsEsm node's estree, strips the `export` keyword, transforms
 * any JSX in function bodies into `React.createElement` calls, then evaluates
 * the whole batch in a single sandboxed Function so later exports can
 * reference earlier ones.
 *
 * Results land on `file.data.mdxishScope`:
 * - function-valued exports → `components`
 * - everything else → `values`
 *
 * The mdxjsEsm nodes are removed from the tree so they don't render as text.
 * On any failure (eval throws, malformed estree) the nodes are still removed
 * and downstream rendering continues with an empty scope.
 */
const evaluateEsm: Plugin<[], Root> = () => (tree: Root, file: VFile) => {
  const programBody: Declaration[] = [];
  const names: string[] = [];
  const esmNodes: { index: number; parent: Root }[] = [];

  visit(tree, isMDXEsm, (node: MdxjsEsm, index, parent) => {
    if (parent && typeof index === 'number') {
      esmNodes.push({ index, parent: parent as Root });
    }

    const body = node.data?.estree?.body;
    if (!body) return;

    body.forEach(child => {
      if (child.type !== 'ExportNamedDeclaration' || !child.declaration) return;
      programBody.push(child.declaration);
      names.push(...collectExportNames(child.declaration));
    });
  });

  esmNodes
    .sort((a, b) => b.index - a.index)
    .forEach(({ index, parent }) => parent.children.splice(index, 1));

  if (!names.length) return tree;

  const scope: MdxishScope = { components: {}, values: {} };

  try {
    const program: Program = { type: 'Program', sourceType: 'module', body: programBody };
    buildJsx(program, { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' });
    const { value: source } = toJs(program);
    // eslint-disable-next-line no-new-func
    const fn = new Function('React', `${source}\nreturn { ${names.join(', ')} };`);
    const result = fn(React) as Record<string, unknown>;

    Object.entries(result).forEach(([name, value]) => {
      if (typeof value === 'function') scope.components[name] = value;
      else scope.values[name] = value;
    });
  } catch {
    // Tokenizer succeeded but evaluation didn't — leave the (empty) scope and
    // let downstream rendering proceed.
  }

  file.data.mdxishScope = scope;

  return tree;
};

export default evaluateEsm;
