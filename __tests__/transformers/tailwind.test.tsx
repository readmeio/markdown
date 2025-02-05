import { compile, run } from '../../index';

describe('tailwind transformer', () => {
  it('should parse a stylesheet', async () => {
    const testComponent = `
export const Styled = () => <div className="bg-blue-500 text-white p-4">Hello, World!</div>;
    `;
    const md = `<Styled />`;

    const TestComponent = await run(await compile(testComponent));
    const { stylesheet } = await run(
      await compile(md, { components: { TestComponent: testComponent, Styled: testComponent }, useTailwind: true }),
      {
        components: { TestComponent },
      },
    );

    expect(stylesheet).toMatchInlineSnapshot(`
      "/*! tailwindcss v4.0.3 | MIT License | https://tailwindcss.com */
      @layer theme, base, components, utilities;
      @layer theme;
      @layer utilities;

      .readme-tailwind {
      }
      "
    `);
  });
});
