import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { Glossary } from '../../components/Glossary';
import { mdxish, renderMdxish } from '../../lib';
import { execute } from '../helpers';

describe('Glossary', () => {
  describe('mdxish', () => {
    it('renders a glossary item without errors', () => {
      const md = 'The term <Glossary>exogenous</Glossary> should render.';
      const mod = renderMdxish(mdxish(md));
      render(<mod.default />);

      expect(screen.getByText('exogenous')).toBeVisible();
    });
  });

  describe('mdx', () => {
    it('renders a glossary item', () => {
      const md = '<Glossary>parliament</Glossary>';
      const Content = execute(md);
      render(<Content />);

      expect(screen.getByText('parliament')).toBeVisible();
    });
  });

  describe('render', () => {
    it('renders the term when found in glossary', () => {
      const terms = [{ term: 'API', definition: 'Application Programming Interface' }];
      render(<Glossary terms={terms}>API</Glossary>);
      expect(screen.getByText('API')).toBeInTheDocument();
    });

    it('renders a tooltip trigger when term is found', () => {
      const terms = [{ term: 'API', definition: 'Application Programming Interface' }];
      const { container } = render(<Glossary terms={terms}>API</Glossary>);
      expect(container.querySelector('.GlossaryItem-trigger')).toBeInTheDocument();
    });

    it('renders a plain span when term is not found', () => {
      const terms = [{ term: 'API', definition: 'Application Programming Interface' }];
      const { container } = render(<Glossary terms={terms}>unknown</Glossary>);
      expect(container.querySelector('.GlossaryItem-trigger')).not.toBeInTheDocument();
      expect(screen.getByText('unknown')).toBeInTheDocument();
    });

    it('shows tooltip with definition on hover', () => {
      const terms = [{ term: 'acme', definition: 'This is a definition' }];
      const { container } = render(<Glossary terms={terms}>acme</Glossary>);

      const trigger = container.querySelector('.GlossaryItem-trigger');
      expect(trigger).toHaveTextContent('acme');
      fireEvent.mouseEnter(trigger!);
      expect(screen.getByText('This is a definition', { exact: false })).toHaveTextContent(
        'acme - This is a definition',
      );
    });

    it('matches terms case-insensitively and shows tooltip', () => {
      const terms = [{ term: 'aCme', definition: 'This is a definition' }];
      const { container } = render(<Glossary terms={terms}>acme</Glossary>);

      const trigger = container.querySelector('.GlossaryItem-trigger');
      expect(trigger).toHaveTextContent('acme');
      fireEvent.mouseEnter(trigger!);
      expect(screen.getByText('This is a definition', { exact: false })).toHaveTextContent(
        'aCme - This is a definition',
      );
    });
  });
});
