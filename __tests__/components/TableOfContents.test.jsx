const React = require('react');
const { shallow, mount } = require('enzyme');

const markdown = require('../../index');
const TableOfContents = require('../../components/TableOfContents');

const { GlossaryContext, VariablesContext } = markdown.utils;
const variables = {
  defaults: [{ test: 'Default Value' }],
  user: { test: 'User Override' },
};
const glossaryTerms = [
  {
    term: 'demos',
    definition: 'things that break on presentation',
  },
];

describe('Table of Contents', () => {
  it('should have a header', () => {
    const toc = shallow(
      <TableOfContents>
        <li>Heading 1</li>
      </TableOfContents>
    );

    expect(toc.find('li').first().text()).toBe('Table of Contents');
  });

  it('generates TOC from headings', () => {
    const txt = '# Heading Zed\n\n# Heading One';
    const ast = markdown.reactProcessor().parse(txt);
    const toc = markdown.reactTOC(ast);
    const dom = mount(toc);

    const items = dom.find('li > a[href]').not('[href=""]');
    expect(items).toHaveLength(2);
  });

  it('includes two heading levels', () => {
    const txt = '# Heading Zed\n\n## Subheading One\n\n### Deep Heading Two';
    const ast = markdown.reactProcessor().parse(txt);
    const toc = markdown.reactTOC(ast);
    const dom = mount(toc);

    const items = dom.find('li > a[href]').not('[href=""]');
    expect(items).toHaveLength(2);
    expect(dom.html()).toMatchSnapshot();
  });

  it('normalizes root depth level', () => {
    const txt = '##### Heading Zed\n\n###### Subheading Zed';
    const ast = markdown.reactProcessor().parse(txt);
    const toc = markdown.reactTOC(ast);
    const dom = mount(toc);

    const items = dom.find('li > a[href]').not('[href=""]');
    expect(items).toHaveLength(2);
  });

  it('includes variables', () => {
    const txt = '# Heading <<test>>';
    const ast = markdown.reactProcessor().parse(txt);
    const toc = markdown.reactTOC(ast);
    const dom = mount(<VariablesContext.Provider value={variables}>{toc}</VariablesContext.Provider>);

    const items = dom.find('li > a[href]').not('[href=""]');
    expect(items.text()).toStrictEqual(`Heading ${variables.user.test}`);
  });

  it('includes glossary items', () => {
    const txt = '# Heading <<glossary:demos>>';
    const ast = markdown.reactProcessor().parse(txt);
    const toc = markdown.reactTOC(ast);
    const dom = mount(<GlossaryContext.Provider value={glossaryTerms}>{toc}</GlossaryContext.Provider>);

    const items = dom.find('li > a[href]').not('[href=""]');
    expect(items.text()).toMatch(`Heading ${glossaryTerms[0].term}`);
  });
});
