import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';

import { Glossary } from '../components/Glossary';

test('should output a glossary item if the term exists', () => {
  const term = 'acme';
  const definition = 'This is a definition';
  const { container } = render(<Glossary terms={[{ term, definition }]}>acme</Glossary>);

  const trigger = container.querySelector('.Glossary-trigger');
  expect(trigger).toHaveTextContent(term);
  if (trigger) {
    fireEvent.mouseEnter(trigger);
  }
  const tooltipContent = screen.getByText(definition, { exact: false });
  expect(tooltipContent).toHaveTextContent(`${term} - ${definition}`);
});

test('should be case insensitive', () => {
  const term = 'aCme';
  const definition = 'This is a definition';
  const { container } = render(<Glossary terms={[{ term, definition }]}>acme</Glossary>);

  const trigger = container.querySelector('.Glossary-trigger');
  expect(trigger).toHaveTextContent('acme');
  if (trigger) {
    fireEvent.mouseEnter(trigger);
  }
  const tooltipContent = screen.getByText(definition, { exact: false });
  expect(tooltipContent).toHaveTextContent(`${term} - ${definition}`);
});

test('should output the term if the definition does not exist', () => {
  const term = 'something';
  const { container } = render(<Glossary terms={[]}>{term}</Glossary>);

  expect(container.querySelector('.Glossary-trigger')).not.toBeInTheDocument();
  expect(container.querySelector('span')).toHaveTextContent(term);
});
