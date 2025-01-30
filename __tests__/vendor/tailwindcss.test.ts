import tailwindcss from '../../vendor/tailwindcss';

describe('tailwindcss', () => {
  it('generates styles', async () => {
    const html = '<div class="bg-red-500 text-white">Hello, world!</div>';
    const styles = await tailwindcss.default(html);

    expect(styles).toContain('.bg-red-500');
  });
});
