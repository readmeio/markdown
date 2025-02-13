import { compile, run } from '../../index';

describe('tailwind transformer', () => {
  it('should parse a stylesheet', async () => {
    const testComponent = `
export const Styled = () => <div className="bg-blue-500 text-white p-4">Hello, World!</div>;
    `;
    const md = '<Styled />';

    const TestComponent = await run(await compile(testComponent));
    const { stylesheet } = await run(
      await compile(md, { components: { TestComponent: testComponent, Styled: testComponent }, useTailwind: true }),
      {
        components: { TestComponent },
      },
    );

    // @fixme: I can't get vitest to bundle css as a string, so this at least
    // asserts that the stylesheet is building?
    expect(stylesheet).toMatchInlineSnapshot(`
      "/*! tailwindcss v4.0.3 | MIT License | https://tailwindcss.com */
      @layer theme, base, components, utilities;
      @layer theme;
      @layer utilities;
      "
    `);
  });

  it('should not throw an exception if a stylesheet is already defined', async () => {
    const testComponent = `
export const Styled = () => <div className="bg-blue-500 text-white p-4">Hello, World!</div>;
    `;
    const md = `
<Styled />

export const stylesheet = ".test { color: red; }";
`;

    const TestComponent = await run(await compile(testComponent));
    const { stylesheet } = await run(
      await compile(md, { components: { TestComponent: testComponent, Styled: testComponent }, useTailwind: true }),
      {
        components: { TestComponent },
      },
    );

    expect(stylesheet).toMatchInlineSnapshot('".test { color: red; }"');
  });
});
