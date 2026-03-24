import { mix } from '../../../lib';

describe('gemoji transformer', () => {
  it('should transform shortcodes back to emojis', () => {
    const md = `🔁

:smiley:

:owlbert:`;
    const stringHast = mix(md);
    expect(stringHast).toMatchInlineSnapshot(`
      "<p>🔁</p>
<p>😃</p>
<p><img src="/public/img/emojis/owlbert.png" alt=":owlbert:" title=":owlbert:" class="emoji" align="absmiddle" height="20" width="20"></p>"
    `);

  });

  it('should render consecutive emoji shortcodes', () => {
    expect(mix(':grin::grin:')).toMatchInlineSnapshot(`"<p>😁😁</p>"`);
  });

  it('should render three consecutive emoji shortcodes', () => {
    expect(mix(':grin::joy::heart:')).toMatchInlineSnapshot(`"<p>😁😂❤️</p>"`);
  });

  it('should render consecutive emojis with surrounding text', () => {
    expect(mix('Hello :grin::grin: world')).toMatchInlineSnapshot(`"<p>Hello 😁😁 world</p>"`);
  });

  it('should render emojis directly adjacent to words', () => {
    expect(mix('hello:grin:')).toMatchInlineSnapshot(`"<p>hello😁</p>"`);
  });

  it('should render emojis at the start of a string even with trailing text', () => {
    expect(mix(':grin:world')).toMatchInlineSnapshot(`"<p>😁world</p>"`);
  });

  it('should render the +1 emoji shortcode', () => {
    expect(mix(':+1:')).toMatchInlineSnapshot(`"<p>👍</p>"`);
  });

  it('should render consecutive +1 emojis', () => {
    expect(mix(':+1::+1:')).toMatchInlineSnapshot(`"<p>👍👍</p>"`);
  });

  it('should handle an invalid shortcode followed by a valid one', () => {
    expect(mix(':notarealemoji::grin:')).toMatchInlineSnapshot(`"<p>:notarealemoji:😁</p>"`);
  });

  it('should handle a valid shortcode followed by an invalid one', () => {
    expect(mix(':grin::notarealemoji:')).toMatchInlineSnapshot(`"<p>😁:notarealemoji:</p>"`);
  });

  it('should render emojis on separate lines', () => {
    expect(mix(':grin:\n\n:joy:')).toMatchInlineSnapshot(`
      "<p>😁</p>
      <p>😂</p>"
    `);
  });

  it('should render consecutive emojis with spaces between them', () => {
    expect(mix(':grin: :joy:')).toMatchInlineSnapshot(`"<p>😁 😂</p>"`);
  });

  it('should handle a single emoji with no surrounding content', () => {
    expect(mix(':heart:')).toMatchInlineSnapshot(`"<p>❤️</p>"`);
  });

  it('should not transform colons that are not emoji shortcodes', () => {
    expect(mix('time is 10:30:00')).toMatchInlineSnapshot(`"<p>time is 10:30:00</p>"`);
  });

  it('should not render emojis when the leading colon is escaped', () => {
    expect(mix('hello\\:grin:')).toMatchInlineSnapshot(`"<p>hello:grin:</p>"`);
  });
});
