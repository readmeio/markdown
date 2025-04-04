import { mdast } from '../../../lib';

// @ts-expect-error - these are being imported as strings
import esmMdx from './esm/in.mdx?raw';
// @ts-expect-error - these are being imported as json
import esmJson from './esm/out.json';
// @ts-expect-error - these are being imported as strings
import inlineImagesMdx from './images/inline/in.mdx?raw';
// @ts-expect-error - these are being imported as json
import inlineImagesJson from './images/inline/out.json';
// @ts-expect-error - these are being imported as strings
import nullAttributesMdx from './null-attributes/in.mdx?raw';
// @ts-expect-error - these are being imported as json
import nullAttributesJson from './null-attributes/out.json';
// @ts-expect-error - these are being imported as strings
import tablesMdx from './tables/in.mdx?raw';
// @ts-expect-error - these are being imported as json
import tablesJson from './tables/out.json';
// @ts-expect-error - these are being imported as strings
import variablesMdx from './variables/in.mdx?raw';
// @ts-expect-error - these are being imported as json
import variablesJson from './variables/out.json';
// @ts-expect-error - these are being imported as strings
import variablesWithSpacesMdx from './variables-with-spaces/in.mdx?raw';
// @ts-expect-error - these are being imported as json
import variablesWithSpacesJson from './variables-with-spaces/out.json';

describe('mdast transformer', () => {
  it('parses null attributes', () => {
    // @ts-expect-error - the custom matcher types are not being set up
    // correctly
    expect(mdast(nullAttributesMdx)).toStrictEqualExceptPosition(nullAttributesJson);
  });

  it('parses tables', () => {
    // @ts-expect-error - the custom matcher types are not being set up
    // correctly
    expect(mdast(tablesMdx)).toStrictEqualExceptPosition(tablesJson);
  });

  it('parses variables', () => {
    // @ts-expect-error - the custom matcher types are not being set up
    // correctly
    expect(mdast(variablesMdx)).toStrictEqualExceptPosition(variablesJson);
  });

  it('parses variables with spaces', () => {
    // @ts-expect-error - the custom matcher types are not being set up
    // correctly
    expect(mdast(variablesWithSpacesMdx)).toStrictEqualExceptPosition(variablesWithSpacesJson);
  });

  it('parses inline images', () => {
    // @ts-expect-error - the custom matcher types are not being set up
    // correctly
    expect(mdast(inlineImagesMdx)).toStrictEqualExceptPosition(inlineImagesJson);
  });

  it('parses esm (imports and exports)', () => {
    // @ts-expect-error - the custom matcher types are not being set up
    // correctly
    expect(mdast(esmMdx)).toStrictEqualExceptPosition(esmJson);
  });

  it('throws an error when a component does not exist and missingComponents === "throw"', () => {
    const mdx = '<NonExistentComponent />';

    expect(() => {
      mdast(mdx, { missingComponents: 'throw' });
    }).toThrow(
      /Expected component `NonExistentComponent` to be defined: you likely forgot to import, pass, or provide it./,
    );
  });

  it('does not throw an error when a component is defined in the page and missingComponents === "throw"', () => {
    const mdx = `
export const Inlined = () => <div>Inlined</div>;

<Inlined />
    `;

    expect(() => {
      mdast(mdx, { missingComponents: 'throw' });
    }).not.toThrow();
  });

  it('removes a component that does not exist and missingComponents === "ignore"', () => {
    const mdx = '<NonExistentComponent />';

    expect(() => {
      mdast(mdx, { missingComponents: 'throw' });
    }).toThrow(
      /Expected component `NonExistentComponent` to be defined: you likely forgot to import, pass, or provide it./,
    );
  });

  it('does not remove a component when it is defined in the page and missingComponents === "ignore"', () => {
    const mdx = `
export const Inlined = () => <div>Inlined</div>;

<Inlined />
    `;

    expect(mdast(mdx, { missingComponents: 'throw' })).toMatchInlineSnapshot(`
      {
        "children": [
          {
            "data": {
              "estree": Node {
                "body": [
                  Node {
                    "declaration": Node {
                      "declarations": [
                        Node {
                          "end": 48,
                          "id": Node {
                            "end": 21,
                            "loc": {
                              "end": {
                                "column": 20,
                                "line": 2,
                                "offset": 21,
                              },
                              "start": {
                                "column": 13,
                                "line": 2,
                                "offset": 14,
                              },
                            },
                            "name": "Inlined",
                            "range": [
                              14,
                              21,
                            ],
                            "start": 14,
                            "type": "Identifier",
                          },
                          "init": Node {
                            "async": false,
                            "body": Node {
                              "children": [
                                Node {
                                  "end": 42,
                                  "loc": {
                                    "end": {
                                      "column": 41,
                                      "line": 2,
                                      "offset": 42,
                                    },
                                    "start": {
                                      "column": 34,
                                      "line": 2,
                                      "offset": 35,
                                    },
                                  },
                                  "range": [
                                    35,
                                    42,
                                  ],
                                  "raw": "Inlined",
                                  "start": 35,
                                  "type": "JSXText",
                                  "value": "Inlined",
                                },
                              ],
                              "closingElement": Node {
                                "end": 48,
                                "loc": {
                                  "end": {
                                    "column": 47,
                                    "line": 2,
                                    "offset": 48,
                                  },
                                  "start": {
                                    "column": 41,
                                    "line": 2,
                                    "offset": 42,
                                  },
                                },
                                "name": Node {
                                  "end": 47,
                                  "loc": {
                                    "end": {
                                      "column": 46,
                                      "line": 2,
                                      "offset": 47,
                                    },
                                    "start": {
                                      "column": 43,
                                      "line": 2,
                                      "offset": 44,
                                    },
                                  },
                                  "name": "div",
                                  "range": [
                                    44,
                                    47,
                                  ],
                                  "start": 44,
                                  "type": "JSXIdentifier",
                                },
                                "range": [
                                  42,
                                  48,
                                ],
                                "start": 42,
                                "type": "JSXClosingElement",
                              },
                              "end": 48,
                              "loc": {
                                "end": {
                                  "column": 47,
                                  "line": 2,
                                  "offset": 48,
                                },
                                "start": {
                                  "column": 29,
                                  "line": 2,
                                  "offset": 30,
                                },
                              },
                              "openingElement": Node {
                                "attributes": [],
                                "end": 35,
                                "loc": {
                                  "end": {
                                    "column": 34,
                                    "line": 2,
                                    "offset": 35,
                                  },
                                  "start": {
                                    "column": 29,
                                    "line": 2,
                                    "offset": 30,
                                  },
                                },
                                "name": Node {
                                  "end": 34,
                                  "loc": {
                                    "end": {
                                      "column": 33,
                                      "line": 2,
                                      "offset": 34,
                                    },
                                    "start": {
                                      "column": 30,
                                      "line": 2,
                                      "offset": 31,
                                    },
                                  },
                                  "name": "div",
                                  "range": [
                                    31,
                                    34,
                                  ],
                                  "start": 31,
                                  "type": "JSXIdentifier",
                                },
                                "range": [
                                  30,
                                  35,
                                ],
                                "selfClosing": false,
                                "start": 30,
                                "type": "JSXOpeningElement",
                              },
                              "range": [
                                30,
                                48,
                              ],
                              "start": 30,
                              "type": "JSXElement",
                            },
                            "end": 48,
                            "expression": true,
                            "generator": false,
                            "id": null,
                            "loc": {
                              "end": {
                                "column": 47,
                                "line": 2,
                                "offset": 48,
                              },
                              "start": {
                                "column": 23,
                                "line": 2,
                                "offset": 24,
                              },
                            },
                            "params": [],
                            "range": [
                              24,
                              48,
                            ],
                            "start": 24,
                            "type": "ArrowFunctionExpression",
                          },
                          "loc": {
                            "end": {
                              "column": 47,
                              "line": 2,
                              "offset": 48,
                            },
                            "start": {
                              "column": 13,
                              "line": 2,
                              "offset": 14,
                            },
                          },
                          "range": [
                            14,
                            48,
                          ],
                          "start": 14,
                          "type": "VariableDeclarator",
                        },
                      ],
                      "end": 49,
                      "kind": "const",
                      "loc": {
                        "end": {
                          "column": 48,
                          "line": 2,
                          "offset": 49,
                        },
                        "start": {
                          "column": 7,
                          "line": 2,
                          "offset": 8,
                        },
                      },
                      "range": [
                        8,
                        49,
                      ],
                      "start": 8,
                      "type": "VariableDeclaration",
                    },
                    "end": 49,
                    "loc": {
                      "end": {
                        "column": 48,
                        "line": 2,
                        "offset": 49,
                      },
                      "start": {
                        "column": 0,
                        "line": 2,
                        "offset": 1,
                      },
                    },
                    "range": [
                      1,
                      49,
                    ],
                    "source": null,
                    "specifiers": [],
                    "start": 1,
                    "type": "ExportNamedDeclaration",
                  },
                ],
                "comments": [],
                "end": 49,
                "loc": {
                  "end": {
                    "column": 48,
                    "line": 2,
                    "offset": 49,
                  },
                  "start": {
                    "column": 0,
                    "line": 2,
                    "offset": 1,
                  },
                },
                "range": [
                  1,
                  49,
                ],
                "sourceType": "module",
                "start": 1,
                "type": "Program",
              },
            },
            "position": {
              "end": {
                "column": 49,
                "line": 2,
                "offset": 49,
              },
              "start": {
                "column": 1,
                "line": 2,
                "offset": 1,
              },
            },
            "type": "mdxjsEsm",
            "value": "export const Inlined = () => <div>Inlined</div>;",
          },
          {
            "attributes": [],
            "children": [],
            "name": "Inlined",
            "position": {
              "end": {
                "column": 12,
                "line": 4,
                "offset": 62,
              },
              "start": {
                "column": 1,
                "line": 4,
                "offset": 51,
              },
            },
            "type": "mdxJsxFlowElement",
          },
        ],
        "position": {
          "end": {
            "column": 5,
            "line": 5,
            "offset": 67,
          },
          "start": {
            "column": 1,
            "line": 1,
            "offset": 0,
          },
        },
        "type": "root",
      }
    `);
  });
});
