import type { RMDXModule } from '../../../types';
import type { Element } from 'hast';

import { mdxish, compile, run } from '../../../lib';

  const exampleComponentCode = `
export const ExampleComponent = ({ header }) => {
  return (
    <div className="flex justify-center">
      <div className="rounded-md p-6 m-4 max-w-lg shadow-md border border-gray-300 dark:bg-gray-800 dark:border-gray-600">
        <p className="text-lg font-bold">{header}</p>
        <p>
          <i className="fa-solid fa-code mr-2" />
          Write <a className="text-blue-500! dark:text-blue-300!" href="https://docs.readme.com/main/v3.0/docs/building-custom-mdx-components" target="_blank">MDX</a> to render interactive content
        </p>
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
import { useState, useEffect, useMemo } from 'react';

export const AdvancedTable = ({ data }) => {
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState(null);
  const rowsPerPage = 6;

  const columns = Object.keys(data[0]);
  const firstCol = columns[0];

  // Filter
  const filteredData = useMemo(() => {
    return data.filter((row) =>
      columns.some((col) =>
        String(row[col] ?? '')
          .toLowerCase()
          .includes(query.toLowerCase())
      )
    );
  }, [data, query, columns]);

    // Sorting
  const sortedData = useMemo(() => {
    if (!sortOrder) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aValue = String(a[firstCol] ?? '');
      const bValue = String(b[firstCol] ?? '');
      if (sortOrder === 'asc') return aValue.localeCompare(bValue, undefined, { numeric: true });
      return bValue.localeCompare(aValue, undefined, { numeric: true });
    });
  }, [filteredData, sortOrder, firstCol]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const toggleSort = () => {
    if (!sortOrder) setSortOrder('asc');
    else if (sortOrder === 'asc') setSortOrder('desc');
    else setSortOrder(null);
  };

  // Export as CSV
  const handleExport = () => {
    if (!sortedData || !sortedData.length) return;

    // Build rows
    const csvRows = [];
    csvRows.push(columns.join(','));
    sortedData.forEach((row) => {
      const values = columns.map((col) => {
        const val = row[col] ?? '';
        return \`"\${String(val).replace(/"/g, '""')}"\`;
      });
      csvRows.push(values.join(','));
    });
    const csvContent = csvRows.join('\\n');

    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'table-data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <input
          placeholder="Filter table…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="px-3 py-1 border border-gray-300 bg-inherit rounded-md text-gray-800 dark:text-white w-50"
        />

        <button
          onClick={handleExport}
          className="px-2 py-1 text-sm bg-inerhit border border-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          type="button"
        >
          <i className="fa fa-file-csv text-gray-500 dark:text-white" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mb-0">
        <table className="min-w-full">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col}
                  className="text-left text-gray-500! dark:text-white!"
                  onClick={idx === 0 ? toggleSort : undefined}
                >
                  {col.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())}
                  {idx === 0 && !sortOrder && <i className="fa fa-arrow-down pl-2 text-[10px] relative bottom-[1px] text-gray-300" />}
                  {idx === 0 && sortOrder === 'asc' && <i className="fa fa-arrow-up pl-2 text-[10px] relative bottom-[1px]" />}
                  {idx === 0 && sortOrder === 'desc' && <i className="fa fa-arrow-down pl-2 text-[10px] relative bottom-[1px]" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col}>
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-gray-400"
                >
                  No matching results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredData.length > rowsPerPage &&
        <div className="">
          <div className="flex items-center gap-1">
            <button
              className="px-3 text-gray-500 rounded font-bold disabled:opacity-50 bg-inherit border-none hover:not-disabled:text-gray-800"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              type="button"
            >
              <i className="fa fa-chevron-left text-xs text-gray-400 pr-1"/> Previous
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                aria-label={\`Page \${idx}\`}
                onClick={() => goToPage(idx + 1)}
                className={\`px-3 py-1 text-sm rounded \${
                  currentPage === idx + 1
                    ? 'bg-blue-100 text-blue-400 font-bold rounded-md border-none'
                    : 'text-gray-500 hover:bg-gray-100 font-bold border-none bg-inherit'
                }\`}
                type="button"
              >
                {idx + 1}
              </button>
            ))}
            <button
              className="px-3 text-xsx text-gray-500 rounded font-bold disabled:opacity-50 bg-inherit border-none hover:not-disabled:text-gray-800"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              type="button"
            >
              Next <i className="fa fa-chevron-right font-bold text-xs text-gray-400 pl-1"/>
            </button>
          </div>
        </div>
      }
    </div>
  );
};

<AdvancedTable
  data={[
    {
      'code': 'APIKEY_EMPTY',
      'status': 'Unauthorized',
      'description': 'An API key was not supplied.',
      'message': 'You must pass in an API key.'
    },
    {
      'code': 'APIKEY_MISMATCH',
      'status': 'Forbidden',
      'description': "The API key doesn't match the project.",
      'message': "The API key doesn't match the project."
    },
    {
      'code': 'APIKEY_NOTFOUND',
      'status': 'Unauthorized',
      'description': "The API key couldn't be located.",
      'message': "We couldn't find your API key."
    },
    {
      'code': 'API_ACCESS_REVOKED',
      'status': 'Forbidden',
      'description': 'Your ReadMe API access has been revoked.',
      'message': 'Your ReadMe API access has been revoked.'
    },
    {
      'code': 'API_ACCESS_UNAVAILABLE',
      'status': 'Forbidden',
      'description': 'Your ReadMe project does not have access to this API. Please reach out to support@readme.io.',
      'message': 'Your ReadMe project does not have access to this API. Please reach out to support@readme.io.'
    },
    {
      'code': 'APPLY_INVALID_EMAIL',
      'status': 'Bad Request',
      'description': 'You need to provide a valid email.',
      'message': 'You need to provide a valid email.'
    },
    {
      'code': 'APPLY_INVALID_JOB',
      'status': 'Bad Request',
      'description': 'You need to provide a job.',
      'message': 'You need to provide a job.'
    },
    {
      'code': 'APPLY_INVALID_NAME',
      'status': 'Bad Request',
      'description': 'You need to provide a name.',
      'message': 'You need to provide a name.'
    },
    {
      'code': 'CATEGORY_INVALID',
      'status': 'Bad Request',
      'description': "The category couldn't be saved.",
      'message': "We couldn't save this category ({error})."
    },
    {
      'code': 'CATEGORY_NOTFOUND',
      'status': 'Not Found',
      'description': "The category couldn't be found.",
      'message': "The category with the slug '{category}' couldn't be found."
    },
    {
      'code': 'CHANGELOG_INVALID',
      'status': 'Bad Request',
      'description': "The changelog couldn't be saved.",
      'message': "We couldn't save this changelog ({error})."
    },
    {
      'code': 'CHANGELOG_NOTFOUND',
      'status': 'Not Found',
      'description': "The changelog couldn't be found.",
      'message': "The changelog with the slug '{slug}' couldn't be found."
    }
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
      'code': 'APIKEY_EMPTY',
      'status': 'Unauthorized',
      'description': 'An API key was not supplied.',
      'message': 'You must pass in an API key.'
    },
    {
      'code': 'APIKEY_MISMATCH',
      'status': 'Forbidden',
      'description': "The API key doesn't match the project.",
      'message': "The API key doesn't match the project."
    },
    {
      'code': 'APIKEY_NOTFOUND',
      'status': 'Unauthorized',
      'description': "The API key couldn't be located.",
      'message': "We couldn't find your API key."
    },
    {
      'code': 'API_ACCESS_REVOKED',
      'status': 'Forbidden',
      'description': 'Your ReadMe API access has been revoked.',
      'message': 'Your ReadMe API access has been revoked.'
    },
    {
      'code': 'API_ACCESS_UNAVAILABLE',
      'status': 'Forbidden',
      'description': 'Your ReadMe project does not have access to this API. Please reach out to support@readme.io.',
      'message': 'Your ReadMe project does not have access to this API. Please reach out to support@readme.io.'
    },
    {
      'code': 'APPLY_INVALID_EMAIL',
      'status': 'Bad Request',
      'description': 'You need to provide a valid email.',
      'message': 'You need to provide a valid email.'
    },
    {
      'code': 'APPLY_INVALID_JOB',
      'status': 'Bad Request',
      'description': 'You need to provide a job.',
      'message': 'You need to provide a job.'
    },
    {
      'code': 'APPLY_INVALID_NAME',
      'status': 'Bad Request',
      'description': 'You need to provide a name.',
      'message': 'You need to provide a name.'
    },
    {
      'code': 'CATEGORY_INVALID',
      'status': 'Bad Request',
      'description': "The category couldn't be saved.",
      'message': "We couldn't save this category ({error})."
    },
    {
      'code': 'CATEGORY_NOTFOUND',
      'status': 'Not Found',
      'description': "The category couldn't be found.",
      'message': "The category with the slug '{category}' couldn't be found."
    },
    {
      'code': 'CHANGELOG_INVALID',
      'status': 'Bad Request',
      'description': "The changelog couldn't be saved.",
      'message': "We couldn't save this changelog ({error})."
    },
    {
      'code': 'CHANGELOG_NOTFOUND',
      'status': 'Not Found',
      'description': "The changelog couldn't be found.",
      'message': "The changelog with the slug '{slug}' couldn't be found."
    }
  ]}
/>
      `;
      const tree = mdxish(md, { components: exampleComponentsWithArray });

      const componentNode = (tree.children[0] as Element).children[0] as Element;
      expect(componentNode.tagName).toBe('AdvancedTable');
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
      expect(String(componentNode.properties?.data)).toContain("doesn't");
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
