import type { RMDXModule } from '../../../types';

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { compile, mdxish, run, renderMdxish } from '../../../lib';

describe('custom components', () => {
  describe('components with dynamic logic', () => {
    it('should pass in props correctly to the component and cause no unexpected props to be passed in', () => {
        const customComponentCode = `
import React, { useState, useMemo } from 'react';

export const SimpleStepper = ({ children }) => {
  const steps = useMemo(() => (Array.isArray(children) ? children : [children]), [children]);

  return (
    <div>
    {steps.map((_, index) => (
        <span key={index} className="step-indicator">
        {index + 1}
        </span>
    ))}
    </div>
  );
};

export const SimpleStep = ({ header, children }) => (
  <div>
    <h2>{header}</h2>
    <div>{children}</div>
  </div>
);

<SimpleStepper>
  <SimpleStep header="Step 1: Plan">
    Plan your documentation and gather resources.
  </SimpleStep>
  <SimpleStep header="Step 2: Write">
    Write effective and clear documentation.
  </SimpleStep>
  <SimpleStep header="Step 3: Review">
    Review and refine your content.
  </SimpleStep>
</SimpleStepper>
        `;

        const compiledModule = run(compile(customComponentCode));
        const components: Record<string, RMDXModule> = {
          ExampleComponent: compiledModule,
          SimpleStepper: compiledModule,
          SimpleStep: compiledModule,
        };

        const md = `
<SimpleStepper>
  <SimpleStep header="Step 1: Plan">
    Plan your documentation and gather resources.
  </SimpleStep>
  <SimpleStep header="Step 2: Write">
    Write effective and clear documentation.
  </SimpleStep>
  <SimpleStep header="Step 3: Review">
    Review and refine your content.
  </SimpleStep>
</SimpleStepper>
        `;
        const mod = renderMdxish(mdxish(md, { components }), { components });
        const { container } = render(<mod.default />);

        // There should be 3 children of the SimpleStepper component
        expect(container.querySelectorAll('.step-indicator')).toHaveLength(3);
    });
  })

});