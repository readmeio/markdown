const { render, fireEvent, screen } = require('@testing-library/react');
const React = require('react');

const { GlossaryItem } = require('../components/GlossaryItem');

test('should output a glossary item if the term exists', () => {
  const term = 'acme';
  const definition = 'This is a definition';
  const { container } = render(<GlossaryItem term={term} terms={[{ term, definition }]} />);

  const trigger = container.querySelector('.GlossaryItem-trigger');
  expect(trigger).toHaveTextContent(term);
  fireEvent.mouseEnter(trigger);
  const tooltipContent = screen.getByText(definition, { exact: false });
  expect(tooltipContent).toHaveTextContent(`${term} - ${definition}`);
});

test('should be case insensitive', () => {
  const term = 'aCme';
  const definition = 'This is a definition';
  const { container } = render(<GlossaryItem term="acme" terms={[{ term, definition }]} />);

  const trigger = container.querySelector('.GlossaryItem-trigger');
  expect(trigger).toHaveTextContent('acme');
  fireEvent.mouseEnter(trigger);
  const tooltipContent = screen.getByText(definition, { exact: false });
  expect(tooltipContent).toHaveTextContent(`${term} - ${definition}`);
});

test('should output the term if the definition does not exist', () => {
  const term = 'something';
  const { container } = render(<GlossaryItem term={term} terms={[]} />);

  expect(container.querySelector('.GlossaryItem-trigger')).not.toBeInTheDocument();
  expect(container.querySelector('span')).toHaveTextContent(term);
});
