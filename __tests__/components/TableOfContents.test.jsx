import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import TableOfContents from '../../components/TableOfContents';
import { mdxish, renderMdxish } from '../../lib';

describe('Table of Contents', () => {
  describe('mdxish', () => {
    it('renders a Toc from headings', () => {
      const md = `# Title

## Subheading

### Third`;
      const { Toc } = renderMdxish(mdxish(md));
      render(<Toc />);

      expect(screen.findByText('Title')).toBeDefined();
      expect(screen.findByText('Subheading')).toBeDefined();
      expect(screen.findByText('Third')).toBeDefined();
    });

    it('limits toc depth to 3', () => {
      const md = `# Title

## Sub

### Third

#### Fourth`;
      const { Toc } = renderMdxish(mdxish(md));
      render(<Toc />);

      expect(screen.findByText('Title')).toBeDefined();
      expect(screen.queryByText('Fourth')).toBeNull();
    });
  });

  describe('mdx', () => {
    it.todo('should render through the mdx pipeline');
  });

  describe('render', () => {
    it('should have a header', () => {
      const { container } = render(
        <TableOfContents>
          <h1>Heading 1</h1>
        </TableOfContents>,
      );

      expect(container.querySelectorAll('li')[0]).toHaveTextContent('Table of Contents');
    });

    it.skip('generates TOC from headings', () => {
      const txt = '# Heading Zed\n\n# Heading One';
      const ast = reactProcessor().parse(txt);
      const toc = reactTOC(ast);
      const { container } = render(toc);

      expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
    });

    it.skip('includes two heading levels', () => {
      const txt = '# Heading Zed\n\n## Subheading One\n\n### Deep Heading Two';
      const ast = reactProcessor().parse(txt);
      const toc = reactTOC(ast);
      const { container } = render(toc);

      expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it.skip('normalizes root depth level', () => {
      const txt = '##### Heading Zed\n\n###### Subheading Zed';
      const ast = reactProcessor().parse(txt);
      const toc = reactTOC(ast);
      const { container } = render(toc);

      expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
    });

    it.skip('includes variables', () => {
      const txt = '# Heading <<test>>';
      const ast = reactProcessor().parse(txt);
      const toc = reactTOC(ast);
      const { container } = render(<VariablesContext.Provider value={variables}>{toc}</VariablesContext.Provider>);

      expect(container.querySelector('li > a[href]:not([href="#"])')).toHaveTextContent(
        `Heading ${variables.user.test}`,
      );
    });

    it.skip('includes glossary items', () => {
      const txt = '# Heading <<glossary:demo>>';
      const ast = reactProcessor().parse(txt);
      const toc = reactTOC(ast);
      const { container } = render(<GlossaryContext.Provider value={glossaryTerms}>{toc}</GlossaryContext.Provider>);

      expect(container.querySelector('li > a[href]:not([href="#"])')).toHaveTextContent(
        `Heading ${glossaryTerms[0].term}`,
      );
    });

    it('accepts custom heading', () => {
      const { container } = render(
        <TableOfContents heading="Custom Heading">
          <h1>Heading 1</h1>
        </TableOfContents>,
      );

      expect(container.querySelectorAll('li')[0]).toHaveTextContent('Custom Heading');
    });
  });
});
