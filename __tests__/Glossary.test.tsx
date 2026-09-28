import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';

import { Glossary } from '../components/Glossary';

test('should output a glossary item if the term exists', () => {
  const term = 'acme';
  const definition = 'This is a definition';
  const { container } = render(<Glossary terms={[{ term, definition }]}>acme</Glossary>);

  const trigger = container.querySelector('.GlossaryItem-trigger');
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

  const trigger = container.querySelector('.GlossaryItem-trigger');
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

  expect(container.querySelector('.GlossaryItem-trigger')).not.toBeInTheDocument();
  expect(container.querySelector('span')).toHaveTextContent(term);
});

test('appends the tooltip inside .rm-ReadMe so dark-mode descendant selectors match', () => {
  const term = 'acme';
  const definition = 'This is a definition';
  const { container } = render(
    <div className="rm-ReadMe" data-color-mode="dark">
      <Glossary terms={[{ term, definition }]}>acme</Glossary>
    </div>,
  );

  const trigger = container.querySelector('.GlossaryItem-trigger');
  if (trigger) {
    fireEvent.mouseEnter(trigger);
  }

  const tooltip = document.querySelector('.GlossaryItem-tooltip-content');
  expect(tooltip).toBeInTheDocument();
  expect(tooltip?.closest('.rm-ReadMe')).toHaveAttribute('data-color-mode', 'dark');
});
