import type { RMDXModule } from '../../../types';

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { compile, mdxish, run, renderMdxish } from '../../../lib';

describe('custom components', () => {
  describe('components with children', () => {
    it('should pass in props correctly without unexpected whitespace', () => {
        // Before, this would pass in some unexpected whitespace to the children
        // and creating more steps
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
        const tree = mdxish(md, { components });
        console.log('[CustomComponents.test.tsx] simple stepper tree', JSON.stringify(tree, null, 2));
        const mod = renderMdxish(tree, { components });
        const { container } = render(<mod.default />);

        // There should be 3 children of the SimpleStepper component
        expect(container.querySelectorAll('.step-indicator')).toHaveLength(3);
    });

    it('should filter whitespace-only text nodes between component children', () => {
      // Test with excessive whitespace between components
      const customComponentCode = `
import React, { useMemo } from 'react';

export const ChildCounter = ({ children }) => {
  const childArray = useMemo(() => (Array.isArray(children) ? children : [children]), [children]);
  return (
    <div>
      <span data-testid="child-count">{childArray.length}</span>
      {children}
    </div>
  );
};

export const Item = ({ label }) => <div className="item">{label}</div>;

<ChildCounter>
  <Item label='A' />
  <Item label='B' />
</ChildCounter>
      `;

      const compiledModule = run(compile(customComponentCode));
      const components: Record<string, RMDXModule> = {
        ChildCounter: compiledModule,
        Item: compiledModule,
      };

      // Whitespace with newlines and tabs between components
      const md = `
<ChildCounter>

  <Item label='First' />

  <Item label='Second' />

  <Item label='Third' />

</ChildCounter>
      `;
      const tree = mdxish(md, { components });
      console.log('[CustomComponents.test.tsx] child counter tree', JSON.stringify(tree, null, 2));

      const mod = renderMdxish(tree, { components });
      const { container } = render(<mod.default />);

      expect(container.querySelector('[data-testid="child-count"]')?.textContent).toBe('3');
      expect(container.querySelectorAll('.item')).toHaveLength(3);
    });

    it('should preserve whitespace when mixed content (components + HTML tags) exists', () => {
      // When standard HTML tags are present, whitespace should be preserved
      const customComponentCode = `
import React, { useMemo } from 'react';

export const MixedContainer = ({ children }) => {
  const childArray = useMemo(() => (Array.isArray(children) ? children : [children]), [children]);
  return (
    <div>
      <span data-testid="child-count">{childArray.length}</span>
      <div data-testid="content">{children}</div>
    </div>
  );
};

export const CustomItem = ({ label }) => <span className="custom-item">{label}</span>;

<MixedContainer>
  <CustomItem label="A" />
  <div>Standard HTML</div>
</MixedContainer>
      `;

      const compiledModule = run(compile(customComponentCode));
      const components: Record<string, RMDXModule> = {
        MixedContainer: compiledModule,
        CustomItem: compiledModule,
      };

      // Mixed: custom component + standard HTML div with whitespace between
      const md = `
<MixedContainer>

  <CustomItem label="Custom" />

  <div className="standard-div">I am a standard div</div>

  <CustomItem label="Another" />

</MixedContainer>
      `;
      const mod = renderMdxish(mdxish(md, { components }), { components });
      const { container } = render(<mod.default />);

      console.log(container.innerHTML);

      // Whitespace nodes should be preserved since there's a standard HTML tag mixed in
      const childCount = parseInt(container.querySelector('[data-testid="child-count"]')?.textContent || '0', 10);
      expect(childCount).toBeGreaterThan(3); // More than 3 means whitespace was preserved
      expect(container.querySelectorAll('.custom-item')).toHaveLength(2);
      expect(container.querySelector('.standard-div')?.textContent).toBe('I am a standard div');
    });

    it('should handle multiple nested components with empty lines between them', () => {
      const customComponentCode = `
import React, { useMemo } from 'react';

export const Outer = ({ children }) => {
  const childArray = useMemo(() => (Array.isArray(children) ? children : [children]), [children]);
  return (
    <div data-testid="outer">
      <span data-testid="outer-count">{childArray.length}</span>
      {children}
    </div>
  );
};

export const Inner = ({ children }) => {
  const childArray = useMemo(() => (Array.isArray(children) ? children : [children]), [children]);
  return (
    <div data-testid="inner" className="inner">
      <span data-testid="inner-count" className="inner-count">{childArray.length}</span>
      {children}
    </div>
  );
};

export const Leaf = ({ name }) => <span className="leaf">{name}</span>;

<Outer>
  <Inner>
    <Leaf name="A" />
  </Inner>
</Outer>
      `;

      const compiledModule = run(compile(customComponentCode));
      const components: Record<string, RMDXModule> = {
        Outer: compiledModule,
        Inner: compiledModule,
        Leaf: compiledModule,
      };

      // Nested with whitespace at multiple levels
      const md = `
<Outer>

  <Inner>

  <Leaf name="leaf 1" />

  <Leaf name="leaf 2" />

  </Inner>

  <Inner>

  <Leaf name="leaf 3" />

  </Inner>

</Outer>
      `;
      const tree = mdxish(md, { components });
      console.log('[CustomComponents.test.tsx] nested components tree', JSON.stringify(tree, null, 2));

      const mod = renderMdxish(tree, { components });
      const { container } = render(<mod.default />);

      // Outer should have exactly 2 Inner children (no whitespace)
      expect(container.querySelector('[data-testid="outer-count"]')?.textContent).toBe('2');
      expect(container.querySelectorAll('.inner')).toHaveLength(2);

      // Each Inner should have the correct number of Leaf children (no whitespace)
      const innerCounts = container.querySelectorAll('.inner-count');
      expect(innerCounts[0]?.textContent).toBe('2'); // First Inner has 2 Leaf
      expect(innerCounts[1]?.textContent).toBe('1'); // Second Inner has 1 Leaf
      expect(container.querySelectorAll('.leaf')).toHaveLength(3);
    });
  })
});
