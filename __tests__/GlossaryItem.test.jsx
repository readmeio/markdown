const { render, fireEvent, screen } = require('@testing-library/react');
const React = require('react');

const { GlossaryItem } = require('../components/GlossaryItem');
const { nodeListSignature, compareNodeListSignatures } = require('../components/GlossaryItem/utils');

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

test('nodeListSignature should return a stable signature for a list of nodes', () => {
  const { container } = render(
    <>
      Text
      <span>Text</span>
      <GlossaryItem term="acme" terms={[{ term: 'acme', definition: 'This is a definition' }]} />
      Text
    </>,
  );

  const signature = nodeListSignature(container.childNodes);
  expect(signature).toStrictEqual(['#text', 'span', 'span[class=GlossaryItem-trigger]', '#text']);
});

test('compareNodeListSignatures should determine if two node lists are structurally equivalent', () => {
  const { container: containerA } = render(
    <>
      Text
      <span>Text</span>
      <GlossaryItem term="acme" terms={[{ term: 'acme', definition: 'This is a definition' }]} />
      Text
    </>,
  );
  const { container: containerB } = render(
    <>
      Text
      <span>Text</span>
      <GlossaryItem term="acme" terms={[{ term: 'acme', definition: 'This is a definition' }]} />
      Text
    </>,
  );
  const { container: containerC } = render(
    <>
      Text
      <span className="I_AM_DIFFERENT">Text</span>
      <GlossaryItem term="acme" terms={[{ term: 'acme', definition: 'This is a definition' }]} />
      Text
    </>,
  );

  expect(compareNodeListSignatures(containerA.childNodes, containerB.childNodes)).toBe(true);
  expect(compareNodeListSignatures(containerA.childNodes, containerC.childNodes)).toBe(false);
});
