const React = require('react');
const { shallow } = require('enzyme');

const TableOfContents = require('../components/TableOfContents');

test('should have a header', () => {
  const toc = shallow(
    <TableOfContents>
      <li>Heading 1</li>
    </TableOfContents>
  );

  expect(toc.find('li').first().text()).toBe('Table of Contents');
});
