import { mdast } from '../../../lib';

import nullAttributesMdx from './null-attributes/in.mdx?raw';
import nullAttributesJson from './null-attributes/out.json';

import tablesMdx from './tables/in.mdx?raw';
import tablesJson from './tables/out.json';

import variablesMdx from './variables/in.mdx?raw';
import variablesJson from './variables/out.json';

import variablesWithSpacesMdx from './variables-with-spaces/in.mdx?raw';
import variablesWithSpacesJson from './variables-with-spaces/out.json';

import inlineImagesMdx from './images/inline/in.mdx?raw';
import inlineImagesJson from './images/inline/out.json';

describe('mdast transformer', async () => {
  it('parses null attributes', () => {
    // @ts-ignore
    expect(mdast(nullAttributesMdx)).toStrictEqualExceptPosition(nullAttributesJson);
  });

  it('parses tables', () => {
    // @ts-ignore
    expect(mdast(tablesMdx)).toStrictEqualExceptPosition(tablesJson);
  });

  it('parses variables', () => {
    // @ts-ignore
    expect(mdast(variablesMdx)).toStrictEqualExceptPosition(variablesJson);
  });

  it.only('parses variables with spaces', () => {
    // @ts-ignore
    expect(mdast(variablesWithSpacesMdx)).toStrictEqualExceptPosition(variablesWithSpacesJson);
  });

  it('parses inline images', () => {
    // @ts-ignore
    expect(mdast(inlineImagesMdx)).toStrictEqualExceptPosition(inlineImagesJson);
  });
});
