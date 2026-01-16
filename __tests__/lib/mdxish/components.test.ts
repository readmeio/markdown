import type { RMDXModule } from '../../../types';
import type { Element } from 'hast';

import { mdxish, compile, run } from '../../../lib';

describe('processing mdx components in mdxish', () => {
  const exampleComponentCode = `
export const ExampleComponent = ({ header }) => {
  return (
    <div className="flex justify-center">
      <div className="rounded-md p-6 m-4">
        <p className="text-lg font-bold">{header}</p>
      </div>
    </div>
  );
};

<ExampleComponent header="Getting Started with Custom Components" />
  `;
  const compiledExampleComponentCode = run(compile(exampleComponentCode));
  const exampleComponents: Record<string, RMDXModule> = {
    ExampleComponent: compiledExampleComponentCode,
  };

  it('should contain a node of a user-provided component with the correct tag name', () => {
    const md = '<ExampleComponent header="Getting Started with Custom Components" />';
    const tree = mdxish(md, { components: exampleComponents });

    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe('element');
    const element = tree.children[0] as Element;
    expect(element.tagName).toBe('ExampleComponent');
    expect(element.properties?.header).toBe('Getting Started with Custom Components');
  });

  describe('when the component props are created using a JSX expression', () => {
    it('should parse a component with a string template literal as a prop', () => {
      const md = '<ExampleComponent header={`Getting Started with Custom Components`} />';
      const tree = mdxish(md, { components: exampleComponents });

      expect(tree.children).toHaveLength(1);
      expect(tree.children[0].type).toBe('element');
      const element = tree.children[0] as Element;
      expect(element.tagName).toBe('ExampleComponent');
      expect(element.properties?.header).toBe('Getting Started with Custom Components');
    });

    it('should parse a component with an array as a prop', () => {
      const componentWithArrayCode = `
export const AdvancedTable = ({ data }) => {
  return (
    <div>
      {data.map((item, index) => (
        <div key={index}>{item.code}: {item.status}</div>
      ))}
    </div>
  );
};

<AdvancedTable
  data={[
    {
      'code': 'EXAMPLE_CODE_1',
      'status': 'EXAMPLE_STATUS_1'
    },
    {
      'code': 'EXAMPLE_CODE_2',
      'status': 'EXAMPLE_STATUS_2'
    },
  ]}
/>
            `;

      const compiledComponentWithArrayCode = run(compile(componentWithArrayCode));
      const exampleComponentsWithArray: Record<string, RMDXModule> = {
        AdvancedTable: compiledComponentWithArrayCode,
      };

      const md = `
<AdvancedTable
  data={[
    {
      'code': 'INPUT_CODE_1',
      'status': 'INPUT_STATUS_1',
    },
    {
      'code': 'INPUT_CODE_2',
      'status': 'INPUT_STATUS_2',
    }
  ]}
/>
      `;
      const tree = mdxish(md, { components: exampleComponentsWithArray });

      const componentNode = (tree.children[0] as Element).children[0] as Element;
      expect(componentNode.tagName).toBe('AdvancedTable');
      expect(componentNode.properties?.data).toStrictEqual(JSON.stringify([
        {
          code: 'INPUT_CODE_1',
          status: 'INPUT_STATUS_1',
        },
        {
          code: 'INPUT_CODE_2',
          status: 'INPUT_STATUS_2',
        },
      ]));
    });

    it('should parse a component with array props containing apostrophes', () => {
      const componentWithApostropheCode = `
export const ApostropheTable = ({ data }) => {
  return (
    <div>
      {data.length}
    </div>
  );
};

<ApostropheTable
  data={[
    {
      'message': "The API key doesn't match the project."
    }
  ]}
/>
      `;

      const compiledComponentWithApostropheCode = run(compile(componentWithApostropheCode));
      const exampleComponentsWithApostrophe: Record<string, RMDXModule> = {
        ApostropheTable: compiledComponentWithApostropheCode,
      };

      const md = `
<ApostropheTable
  data={[
    {
      'message': "The API key doesn't match the project."
    }
  ]}
/>
      `;
      const tree = mdxish(md, { components: exampleComponentsWithApostrophe });

      const componentNode = (tree.children[0] as Element).children[0] as Element;
      expect(componentNode.tagName).toBe('ApostropheTable');
      expect(String(componentNode.properties?.data)).toContain('The API key doesn\'t match the project.');
    });

    it('should parse a component with multiline props', () => {
      const componentWithMultilinePropsCode = `
import { useEffect, useState } from 'react';

export const ContentModal = ({
  label,
  title,
  content,
  size = 'md',
  buttonColor = '#0B1440'
}) => {
  const [open, setOpen] = useState(false);

  const sizeClasses = {
    sm: 'max-w-[480px]',
    md: 'max-w-[720px]',
    lg: 'max-w-[960px]',
    xl: 'max-w-[1200px]'
  };

  // ESC to close
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={\`inline-flex items-center justify-center gap-2 py-3 px-5 text-white bg-[\${buttonColor}] border-none rounded-sm cursor-pointer hover:opacity-85\`}
        onClick={() => setOpen(true)}
      >
        {label} <i className="fa-solid fa-up-right-from-square" aria-hidden="true" />
      </button>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 before:content-[''] before:absolute before:inset-0 before:bg-black/50 before:backdrop-blur"
        style={{ display: open ? 'block' : 'none' }}
        aria-hidden="true"
      />

      {/* Dialog Wrapper */}
      <div
        className="fixed inset-0 flex items-center justify-center p-6 z-50"
        style={{ display: open ? 'flex' : 'none' }}
        onClick={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(false)}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      >
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          className={\`\${sizeClasses[size]} w-full max-h-[86vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col\`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h2 className="m-0 text-lg! font-semibold text-gray-900 dark:text-white!">
              {title}
            </h2>
            <button
              className="flex-shrink-0 border-none bg-transparent text-md leading-none cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0"
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-6 py-5 text-gray-900 dark:text-white">
            {content}
          </div>
        </div>
      </div>
    </>
  );
};

<ContentModal
  label="Open Content Modal"
  title="Content Modal"
  size="md"
  buttonColor="#0B1440"
  content={\`The ContentModal component can be used to display information in a focused, overlay-style container that sits on top of your guides page.
  Modals are typically used to draw attention to important actions, confirmations, or details without navigating away from the current view.
  Users can close it by clicking outside, pressing ESC, or selecting the close button.\`}
/>
      `;

      const compiledComponentWithMultilinePropsCode = run(compile(componentWithMultilinePropsCode));
      const exampleComponentsWithArray: Record<string, RMDXModule> = {
        ContentModal: compiledComponentWithMultilinePropsCode,
      };

      const md = `
<ContentModal
  label="Open Content Modal"
  title="Content Modal"
  size="md"
  buttonColor="#0B1440"
  content={\`The ContentModal component can be used to display information in a focused, overlay-style container that sits on top of your guides page.
  Modals are typically used to draw attention to important actions, confirmations, or details without navigating away from the current view.
  Users can close it by clicking outside, pressing ESC, or selecting the close button.\`}
/>
      `;
      const tree = mdxish(md, { components: exampleComponentsWithArray });

      const componentNode = (tree.children[0] as Element).children[0] as Element;
      expect(componentNode.tagName).toBe('ContentModal');
      expect(componentNode.properties).toMatchObject({
        label: 'Open Content Modal',
        title: 'Content Modal',
        size: 'md',
        buttonColor: '#0B1440',
        content: `The ContentModal component can be used to display information in a focused, overlay-style container that sits on top of your guides page.
Modals are typically used to draw attention to important actions, confirmations, or details without navigating away from the current view.
Users can close it by clicking outside, pressing ESC, or selecting the close button.`,
      });
    });
  })
});
