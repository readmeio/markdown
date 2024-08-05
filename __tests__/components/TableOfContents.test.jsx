const { render } = require('@testing-library/react');
const React = require('react');

const TableOfContents = require('../../components/TableOfContents');
const markdown = require('../../index');

const { GlossaryContext, VariablesContext } = markdown.utils;
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

describe('Table of Contents', () => {
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
    const ast = markdown.reactProcessor().parse(txt);
    const toc = markdown.reactTOC(ast);
    const { container } = render(toc);

    expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
  });

  it('includes two heading levels', () => {
    const txt = '# Heading Zed\n\n## Subheading One\n\n### Deep Heading Two';
    const ast = markdown.reactProcessor().parse(txt);
    const toc = markdown.reactTOC(ast);
    const { container } = render(toc);

    expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('normalizes root depth level', () => {
    const txt = '##### Heading Zed\n\n###### Subheading Zed';
    const ast = markdown.reactProcessor().parse(txt);
    const toc = markdown.reactTOC(ast);
    const { container } = render(toc);

    expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
  });

  it('includes variables', () => {
    const txt = '# Heading <<test>>';
    const ast = markdown.reactProcessor().parse(txt);
    const toc = markdown.reactTOC(ast);
    const { container } = render(<VariablesContext.Provider value={variables}>{toc}</VariablesContext.Provider>);

    expect(container.querySelector('li > a[href]:not([href="#"])')).toHaveTextContent(`Heading ${variables.user.test}`);
  });

  it('includes glossary items', () => {
    const txt = '# Heading <<glossary:demo>>';
    const ast = markdown.reactProcessor().parse(txt);
    const toc = markdown.reactTOC(ast);
    const { container } = render(<GlossaryContext.Provider value={glossaryTerms}>{toc}</GlossaryContext.Provider>);

    expect(container.querySelector('li > a[href]:not([href="#"])')).toHaveTextContent(
      `Heading ${glossaryTerms[0].term}`,
    );
  });
});
