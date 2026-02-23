import { render, screen } from '@testing-library/react';
import React from 'react';

import { Glossary } from '../../components/Glossary';
import { execute } from '../helpers';

describe('Glossary', () => {
  describe('mdxish', () => {
    it.todo('should render through the mdxish pipeline');
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
  });
});
