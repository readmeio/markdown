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

test('should be case insensitive', () => {
  const term = 'aCme';
  const definition = 'This is a definition';
  const { container } = render(<GlossaryItem term="acme" terms={[{ term, definition }]} />);

  expect(container.querySelector('.glossary-item.highlight')).toHaveTextContent('acme');
  expect(container.querySelector('.tooltip-content-body')).toHaveTextContent(`${term} - ${definition}`);
});

test('should output the term if the term does not exist', () => {
  const term = 'something';
  const { container } = render(<GlossaryItem term={term} terms={[]} />);

  expect(container.querySelector('.glossary-item.highlight')).not.toBeInTheDocument();
  expect(container.querySelector('span')).toHaveTextContent(term);
});
