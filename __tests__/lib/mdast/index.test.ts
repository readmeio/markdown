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
});
