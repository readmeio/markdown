import type { HastHeading } from '../../../types';

import { render, screen } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../index';

describe('toc', () => {
    it('extracts TOC from headings', () => {
        const text = `# Heading 1 Name

Random text

## Heading 2 Name
    `;
        const tree = mdxish(text);
        const mod = renderMdxish(tree);

        expect(mod.toc).toBeDefined();
        expect(mod.toc).toHaveLength(2);

        const firstHeading = mod.toc[0] as HastHeading;
        const secondHeading = mod.toc[1] as HastHeading;
        expect(firstHeading.properties.id).toBe('heading-1-name');
        expect(secondHeading.properties.id).toBe('heading-2-name');

        render(<mod.Toc />);
        expect(screen.findByText('Heading 1 Name')).toBeDefined();
        expect(screen.findByText('Heading 2 Name')).toBeDefined();
      });
});