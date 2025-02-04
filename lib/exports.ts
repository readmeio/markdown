import type { MdxjsEsm } from 'mdast-util-mdx';

import { visit } from 'unist-util-visit';

import { isMDXEsm } from '../processor/utils';

import mdast from './mdast';

/* Example mdast structures to find first export name in a mdxjsEsm node:
There are three types of export declarations that we need to consider:
1. VARIABLE DECLARATION
      "type": "mdxjsEsm",
      "value": "export const Foo = () => <div>Hello world</div>\nexport const Bar = () => <div>hello darkness my old friend</div>",
      "data": {
        "estree": {
          "type": "Program",
          "body": [
            {
              "type": "ExportNamedDeclaration",
              "declaration": {
                "type": "VariableDeclaration",
                "declarations": [
                  {
                    "type": "VariableDeclarator",
                    "id": {
                      "type": "Identifier",
                      "name": "Foo" // --------> This is the export name
                    },
                    ...

2/3. FUNCTION DECLARATION & CLASS DECLARATION
      "estree": {
          "type": "Program",
          "body": [
            {
              "type": "ExportNamedDeclaration",
              "declaration": {
                "type": "ClassDeclaration" | "FunctionDeclaration",
                "id": {
                  "type": "Identifier",
                  "name": "Foo" // --------> This is the export name
                },
*/

const exports = (doc: string) => {
  const set = new Set<string>();

  visit(mdast(doc), isMDXEsm, (node: MdxjsEsm) => {
    // Once inside an mdxjsEsm node, we need to check for one or more declared exports within data.estree.body
    // This is because single newlines \n are not considered as a new block, so there may be more than one export statement in a single mdxjsEsm node
    const body = node.data?.estree.body;
    if (!body) return;

    body.forEach(child => {
      if (child.type === 'ExportNamedDeclaration') {
        // There are three types of ExportNamedDeclaration that we need to consider: VariableDeclaration, FunctionDeclaration, ClassDeclaration
        const declaration = child.declaration;

        // FunctionDeclaration and ClassDeclaration have the same structure
        if (declaration.type !== 'VariableDeclaration') {
          // Note: declaration.id.type is always 'Identifier' for FunctionDeclarations and ClassDeclarations
          set.add(declaration.id.name);
        } else {
          declaration.declarations.forEach(({ id }) => {
            if (id.type === 'Identifier') {
              set.add(id.name);
            }
          });
        }
      }
    });
  });

  return Array.from(set);
};

export default exports;
