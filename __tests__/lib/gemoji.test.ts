import { mix } from '../../lib';

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
});