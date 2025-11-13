import { mdast } from '../../../lib';

// @ts-expect-error - these are being imported as strings
import esmMdx from './esm/in.mdx?raw';
// @ts-expect-error - these are being imported as json
import esmJson from './esm/out.json';
// @ts-expect-error - these are being imported as strings
import htmlBlockMdx from './html-blocks/in.mdx?raw';
import htmlBlockJson from './html-blocks/out.json';
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
import variablesJson from './variables/out.json';
import variablesWithSpacesMdx from './variables-with-spaces/in.mdx?raw';
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

  it('parses HTMLBlock contents', () => {
    // @ts-expect-error - the custom matcher types are not being set up
    // correctly
    expect(mdast(htmlBlockMdx)).toStrictEqualExceptPosition(htmlBlockJson);
  });

  it('throws an error when a component does not exist and missingComponents === "throw"', () => {
    const mdx = '<NonExistentComponent />';

    expect(() => {
      mdast(mdx, { missingComponents: 'throw' });
    }).toThrow(
      /Expected component `NonExistentComponent` to be defined: you likely forgot to import, pass, or provide it./,
    );
  });

  it('does not throw an error when a component is defined as a named export and missingComponents === "throw"', () => {
    const mdx = '<NamedExport />';
    const Component = 'export const NamedExport = () => "It works?!"';

    expect(() => {
      mdast(mdx, { missingComponents: 'throw', components: { Component } });
    }).not.toThrow();
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

    expect(mdast(mdx, { missingComponents: 'throw' })).toMatchSnapshot();
  });

  it('does not throw an error when a Recipe is included and missingComponents === "throw"', () => {
    const mdx = '<Recipe />';

    expect(() => {
      mdast(mdx, { missingComponents: 'throw' });
    }).not.toThrow();
  });

  it('does not throw an error when a TutorialTile is included and missingComponents === "throw"', () => {
    const mdx = '<TutorialTile />';

    expect(() => {
      mdast(mdx, { missingComponents: 'throw' });
    }).not.toThrow();
  });
});
