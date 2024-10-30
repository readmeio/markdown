import { render } from '@testing-library/react';
import React from 'react';

import TableOfContents from '../../components/TableOfContents';
import { utils, reactProcessor, reactTOC } from '../../index';

const { GlossaryContext, VariablesContext } = utils;
const variables = {
  defaults: [{ test: 'Default Value' }],
  user: { test: 'User Override' },
};
const glossaryTerms = [
  {
    term: 'demo',
    definition: 'a thing that breaks on presentation',
  },
];

describe.skip('Table of Contents', () => {
  it('should have a header', () => {
    const { container } = render(
      <TableOfContents>
        <h1>Heading 1</h1>
      </TableOfContents>,
    );

    expect(container.querySelectorAll('li')[0]).toHaveTextContent('Table of Contents');
  });

  it('generates TOC from headings', () => {
    const txt = '# Heading Zed\n\n# Heading One';
    const ast = reactProcessor().parse(txt);
    const toc = reactTOC(ast);
    const { container } = render(toc);

    expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
  });

  it('includes two heading levels', () => {
    const txt = '# Heading Zed\n\n## Subheading One\n\n### Deep Heading Two';
    const ast = reactProcessor().parse(txt);
    const toc = reactTOC(ast);
    const { container } = render(toc);

    expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('normalizes root depth level', () => {
    const txt = '##### Heading Zed\n\n###### Subheading Zed';
    const ast = reactProcessor().parse(txt);
    const toc = reactTOC(ast);
    const { container } = render(toc);

    expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
  });

  it('includes variables', () => {
    const txt = '# Heading <<test>>';
    const ast = reactProcessor().parse(txt);
    const toc = reactTOC(ast);
    const { container } = render(<VariablesContext.Provider value={variables}>{toc}</VariablesContext.Provider>);

    expect(container.querySelector('li > a[href]:not([href="#"])')).toHaveTextContent(`Heading ${variables.user.test}`);
  });

  it('includes glossary items', () => {
    const txt = '# Heading <<glossary:demo>>';
    const ast = reactProcessor().parse(txt);
    const toc = reactTOC(ast);
    const { container } = render(<GlossaryContext.Provider value={glossaryTerms}>{toc}</GlossaryContext.Provider>);

    expect(container.querySelector('li > a[href]:not([href="#"])')).toHaveTextContent(
      `Heading ${glossaryTerms[0].term}`,
    );
  });
});
