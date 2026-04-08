import type { RMDXModule } from '../../../types';
import type { Element, Text } from 'hast';

import { mdxish, compile, run } from '../../../lib';
import { JSON_VALUE_MARKER } from '../../../processor/transform/mdxish/preprocess-jsx-expressions';

describe('end-to-end tests in the mdxish pipeline for various types and variations of MDX components', () => {
  // Create & compile example component
  const exampleComponentCode = `
export const ExampleComponent = ({ header, body, children }) => {
  return (
    <div className="flex justify-center">
      <div className="rounded-md p-6 m-4">
        <p className="text-lg font-bold">{header}</p>
      </div>
      <div className="rounded-md p-6 m-4">
        <p className="text-lg font-bold">{body}</p>
      </div>
      <div className="rounded-md p-6 m-4">
        {children}
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

  it('should create an element node with the correct component name and attributes', () => {
    const md = '<ExampleComponent header="This is a header" body="This is a body" />';
    const tree = mdxish(md, { components: exampleComponents });

    expect(tree.children).toHaveLength(1);
    const element = tree.children[0] as Element;
    expect(element.tagName).toBe('ExampleComponent');
    expect(element.properties?.header).toBe('This is a header');
    expect(element.properties?.body).toBe('This is a body');
  });

  it('should parse component when sandwhiched between other text', () => {
    const md = 'Before <ExampleComponent body="This is a body" /> After';
    const tree = mdxish(md, { components: exampleComponents });

    // Content nodes are wrapped in a paragraph node
    const content = (tree.children[0] as Element);
    expect(content.children).toHaveLength(3);

    const firstText = content.children[0] as Text;
    expect(firstText.value).toBe('Before ');
    const lastText = content.children[2] as Text;
    expect(lastText.value).toBe(' After');

    const componentNode = content.children[1] as Element;
    expect(componentNode.tagName).toBe('ExampleComponent');
    expect(componentNode.properties?.body).toBe('This is a body');
  });

  it('should handle attributes with template literals as a prop', () => {
    const md = '<ExampleComponent header={`This is a header`} body={`This is a body`} />';
    const tree = mdxish(md, { components: exampleComponents });

    expect(tree.children).toHaveLength(1);
    const element = tree.children[0] as Element;
    expect(element.tagName).toBe('ExampleComponent');
    expect(element.properties?.header).toBe('This is a header');
    expect(element.properties?.body).toBe('This is a body');
  });

  it('should parse a component with a string template literal as a prop containing special characters', () => {
    const md = '<ExampleComponent header={`Special characters: < > & " \n ; /`} />';
    const tree = mdxish(md, { components: exampleComponents });

    expect(tree.children).toHaveLength(1);
    const element = tree.children[0] as Element;
    expect(element.tagName).toBe('ExampleComponent');
    expect(element.properties?.header).toBe('Special characters: < > & " \n ; /');
  });

  describe('with complex prop values', () => {
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
      'code': '<INPUT_CODE_1>',
      'status': '<INPUT_STATUS_1>',
    },
    {
      'code': '<INPUT_CODE_2>',
      'status': '<INPUT_STATUS_2>',
    }
  ]}
/>
      `;
      const tree = mdxish(md, { components: exampleComponentsWithArray });

      const componentNode = tree.children[0] as Element;
      expect(componentNode.tagName).toBe('AdvancedTable');
      expect(componentNode.properties?.data).toBe(`${JSON_VALUE_MARKER}${JSON.stringify([
        {
          code: '<INPUT_CODE_1>',
          status: '<INPUT_STATUS_1>',
        },
        {
          code: '<INPUT_CODE_2>',
          status: '<INPUT_STATUS_2>',
        },
      ])}`);
    });

    it('should parse a component with array props containing special characters', () => {
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
      'message': "The <API_KEY> doesn't match the project."
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
      'message': "The <API_KEY> doesn't match the project."
    }
  ]}
/>
      `;
      const tree = mdxish(md, { components: exampleComponentsWithApostrophe });

      const componentNode = tree.children[0] as Element;
      expect(componentNode.tagName).toBe('ApostropheTable');
      expect(String(componentNode.properties?.data)).toContain('The <API_KEY> doesn\'t match the project.');
    });

    it('should parse a component with multiline props', () => {
      const componentWithMultilinePropsCode = `
export const ContentModal = ({
  label,
  title,
  content
}) => {
  return (
    <div>
      <div>{label}</div>
      <h2>{title}</h2>
      <p>{content}</p>
    </div>
  );
};

<ContentModal
  label="Open Content Modal"
  title="Content Modal"
  content={\`Lorem ipsum dolor sit amet,
  consectetur adipiscing elit.
  Sed do eiusmod tempor incididunt ut
  labore et dolore magna aliqua.\`}
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
  content={\`Lorem ipsum dolor sit amet,
consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut
labore et dolore magna aliqua.\`}
/>
      `;
      const tree = mdxish(md, { components: exampleComponentsWithArray });

      const componentNode = tree.children[0] as Element;
      expect(componentNode.tagName).toBe('ContentModal');
      expect(componentNode.properties).toMatchObject({
        label: 'Open Content Modal',
        title: 'Content Modal',
        content: `Lorem ipsum dolor sit amet,
consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut
labore et dolore magna aliqua.`,
      });
    });
  });

  it('should not evaluate an attribute expression if in safe mode', () => {
    const md = '<ExampleComponent header={1+1} body={"HELLO".toLowerCase()} />';
    const tree = mdxish(md, { components: exampleComponents, safeMode: true });

    expect(tree.children).toHaveLength(1);
    const element = tree.children[0] as Element;
    expect(element.tagName).toBe('ExampleComponent');
    expect(element.properties?.header).toBe('{1+1}');
    expect(element.properties?.body).toBe('{"HELLO".toLowerCase()}');
  });

  it('should recognize nested components', () => {
    const md = '<ExampleComponent body="This is outer content"><ExampleComponent body="This is inner content" /></ExampleComponent>';
    const tree = mdxish(md, { components: exampleComponents });

    expect(tree.children).toMatchObject([
      {
        type: 'element',
        tagName: 'p',
        children: [
          {
            type: 'element',
            tagName: 'ExampleComponent',
            properties: {
              body: 'This is outer content',
            },
            children: [{
              type: 'element',
              tagName: 'ExampleComponent',
              properties: {
                body: 'This is inner content',
              },
              children: [],
            }]
          },
        ],
      },
    ]);
  });
});
