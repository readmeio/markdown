const React = require('react');
const { render } = require('@testing-library/react');

const { GlossaryItem } = require('../components/GlossaryItem');

test('should output a glossary item if the term exists', () => {
  const term = 'acme';
  const definition = 'This is a definition';
  const { container } = render(<GlossaryItem term={term} terms={[{ term, definition }]} />);

  expect(container.querySelector('.glossary-item.highlight')).toHaveTextContent(term);
  expect(container.querySelector('.tooltip-content-body')).toHaveTextContent(`${term} - ${definition}`);
});

test('should output nothing if the term does not exist', () => {
  const { container } = render(<GlossaryItem term="something" terms={[]} />);
  expect(container).toBeEmptyDOMElement();
});
