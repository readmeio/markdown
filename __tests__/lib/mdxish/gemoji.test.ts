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
});