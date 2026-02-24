import { mix } from '../../lib';

describe('mix', () => {
  it('renders markdown as HTML', () => {
    const html = mix('# Hello World');
    expect(html).toContain('<h1');
    expect(html).toContain('Hello World');
  });

  it('returns empty string for blank input', () => {
    expect(mix('')).toBe('');
  });
});
