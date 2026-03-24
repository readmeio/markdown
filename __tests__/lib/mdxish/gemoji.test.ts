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
    expect(mix(':grin::grin:')).toMatchInlineSnapshot('"<p>😁😁</p>"');
  });

  it('should render three consecutive emoji shortcodes', () => {
    expect(mix(':grin::joy::heart:')).toMatchInlineSnapshot('"<p>😁😂❤️</p>"');
  });

  it('should render consecutive emojis with surrounding text', () => {
    expect(mix('Hello :grin::grin: world')).toMatchInlineSnapshot('"<p>Hello 😁😁 world</p>"');
  });

  it('should render emojis directly adjacent to words', () => {
    expect(mix('hello:grin:')).toMatchInlineSnapshot('"<p>hello😁</p>"');
  });

  it('should render emojis at the start of a string even with trailing text', () => {
    expect(mix(':grin:world')).toMatchInlineSnapshot('"<p>😁world</p>"');
  });

  it('should render the +1 emoji shortcode', () => {
    expect(mix(':+1:')).toMatchInlineSnapshot('"<p>👍</p>"');
  });

  it('should render consecutive +1 emojis', () => {
    expect(mix(':+1::+1:')).toMatchInlineSnapshot('"<p>👍👍</p>"');
  });

  it('should handle an invalid shortcode followed by a valid one', () => {
    expect(mix(':notarealemoji::grin:')).toMatchInlineSnapshot('"<p>:notarealemoji:😁</p>"');
  });

  it('should handle a valid shortcode followed by an invalid one', () => {
    expect(mix(':grin::notarealemoji:')).toMatchInlineSnapshot('"<p>😁:notarealemoji:</p>"');
  });

  it('should render emojis on separate lines', () => {
    expect(mix(':grin:\n\n:joy:')).toMatchInlineSnapshot(`
      "<p>😁</p>
      <p>😂</p>"
    `);
  });

  it('should render consecutive emojis with spaces between them', () => {
    expect(mix(':grin: :joy:')).toMatchInlineSnapshot('"<p>😁 😂</p>"');
  });

  it('should handle a single emoji with no surrounding content', () => {
    expect(mix(':heart:')).toMatchInlineSnapshot('"<p>❤️</p>"');
  });

  it('should not transform colons that are not emoji shortcodes', () => {
    expect(mix('time is 10:30:00')).toMatchInlineSnapshot('"<p>time is 10:30:00</p>"');
  });

  it('should not render emojis when the leading colon is escaped', () => {
    expect(mix('hello\\:grin:')).toMatchInlineSnapshot('"<p>hello:grin:</p>"');
  });

  it('should render emojis adjacent to text with no space', () => {
    expect(mix('hello:grin:\n\nhello\\:grin:')).toMatchInlineSnapshot(`
      "<p>hello😁</p>
      <p>hello:grin:</p>"
    `);
  });

  describe('inline formatting', () => {
    it('should render consecutive emojis inside bold text', () => {
      expect(mix('**bold :grin::grin: text**')).toMatchInlineSnapshot('"<p><strong>bold 😁😁 text</strong></p>"');
    });

    it('should render consecutive emojis inside italic text', () => {
      expect(mix('_italic :grin::grin: text_')).toMatchInlineSnapshot('"<p><em>italic 😁😁 text</em></p>"');
    });

    it('should render consecutive emojis inside strikethrough text', () => {
      expect(mix('~~strikethrough :grin::grin: text~~')).toMatchInlineSnapshot(
        '"<p><del>strikethrough 😁😁 text</del></p>"',
      );
    });

    it('should render consecutive emojis inside bold italic text', () => {
      expect(mix('**_bold italic :grin::grin:_**')).toMatchInlineSnapshot(
        '"<p><strong><em>bold italic 😁😁</em></strong></p>"',
      );
    });

    it('should render consecutive emojis in link text', () => {
      expect(mix('[link :grin::grin:](https://example.com)')).toMatchInlineSnapshot(
        '"<p><a href="https://example.com">link 😁😁</a></p>"',
      );
    });

    it('should render consecutive emojis in image alt text', () => {
      expect(mix('![alt :grin::grin:](https://example.com/img.png)')).toMatchInlineSnapshot(
        '"<img alt="alt 😁😁" src="https://example.com/img.png">"',
      );
    });
  });

  describe('block-level elements', () => {
    it('should render consecutive emojis in headings', () => {
      expect(mix('# Heading :grin::grin:')).toMatchInlineSnapshot('"<h1 id="heading-">Heading 😁😁</h1>"');
    });

    it('should render consecutive emojis in h2', () => {
      expect(mix('## Heading :grin::grin:')).toMatchInlineSnapshot('"<h2 id="heading-">Heading 😁😁</h2>"');
    });

    it('should render consecutive emojis in unordered list items', () => {
      expect(mix('- item :grin::grin:\n- another :joy::joy:')).toMatchInlineSnapshot(`
        "<ul>
        <li>item 😁😁</li>
        <li>another 😂😂</li>
        </ul>"
      `);
    });

    it('should render consecutive emojis in ordered list items', () => {
      expect(mix('1. first :grin::grin:\n2. second :joy::joy:')).toMatchInlineSnapshot(`
        "<ol>
        <li>first 😁😁</li>
        <li>second 😂😂</li>
        </ol>"
      `);
    });

    it('should render consecutive emojis in task list items', () => {
      expect(mix('- [ ] todo :grin::grin:\n- [x] done :joy::joy:')).toMatchInlineSnapshot(`
        "<ul class="contains-task-list">
        <li class="task-list-item"><input type="checkbox" disabled> todo 😁😁</li>
        <li class="task-list-item"><input type="checkbox" checked disabled> done 😂😂</li>
        </ul>"
      `);
    });

    it('should render consecutive emojis in a non-callout blockquote', () => {
      expect(mix('> quoted text :grin::grin:')).toMatchInlineSnapshot(`
        "<blockquote>
        <p>quoted text 😁😁</p>
        </blockquote>"
      `);
    });

    it('should render consecutive emojis in nested blockquotes', () => {
      expect(mix('> > nested :grin::grin:')).toMatchInlineSnapshot(`
        "<blockquote>
        <blockquote>
        <p>nested 😁😁</p>
        </blockquote>
        </blockquote>"
      `);
    });
  });

  describe('GFM tables', () => {
    it('should render consecutive emojis in table header cells', () => {
      expect(mix('| Header :grin::grin: |\n| --- |\n| cell |')).toMatchInlineSnapshot(`
        "










        <table><thead><tr><th>Header 😁😁</th></tr></thead><tbody><tr><td>cell</td></tr></tbody></table>"
      `);
    });

    it('should render consecutive emojis in table body cells', () => {
      expect(mix('| Header |\n| --- |\n| cell :grin::grin: |')).toMatchInlineSnapshot(`
        "










        <table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>cell 😁😁</td></tr></tbody></table>"
      `);
    });
  });

  describe('code contexts (should NOT render emojis)', () => {
    it('should not render emojis inside fenced code blocks', () => {
      expect(mix('```\n:grin::grin:\n```')).toMatchInlineSnapshot(`
        "<pre><code value=":grin::grin:">:grin::grin:
        </code></pre>"
      `);
    });

    it('should not render emojis inside inline code', () => {
      expect(mix('`:grin::grin:`')).toMatchInlineSnapshot('"<p><code>:grin::grin:</code></p>"');
    });
  });

  describe('magic blocks', () => {
    it('should render consecutive emojis inside a parameters magic block', () => {
      const md = `[block:parameters]
{
  "data": {"h-0": "Header", "0-0": "My name is <<name>>! :grin::grin:"},
  "cols": 1,
  "rows": 1
}
[/block]`;
      expect(mix(md)).toMatchInlineSnapshot(`
        "










        <table><thead><tr><th align="left">Header</th></tr></thead><tbody><tr><td align="left">My name is <variable name="name" isLegacy></variable>! 😁😁</td></tr></tbody></table>"
      `);
    });

    it('should render consecutive emojis in parameters header cells', () => {
      const md = `[block:parameters]
{
  "data": {"h-0": "Header :grin::grin:", "0-0": "cell"},
  "cols": 1,
  "rows": 1
}
[/block]`;
      expect(mix(md)).toMatchInlineSnapshot(`
        "










        <table><thead><tr><th align="left">Header 😁😁</th></tr></thead><tbody><tr><td align="left">cell</td></tr></tbody></table>"
      `);
    });

    it('should render consecutive emojis inside a callout magic block', () => {
      const md = '[block:callout]{"type":"info","title":"Note","body":"This is important :grin::grin:"}[/block]';
      expect(mix(md)).toMatchInlineSnapshot(
        '"<Callout icon="📘" theme="info" type="info"><h3 id="note">Note</h3><p>This is important 😁😁</p></Callout>"',
      );
    });

    it('should render consecutive emojis in a callout magic block title', () => {
      const md = '[block:callout]{"type":"info","title":"Note :grin::grin:","body":"body text"}[/block]';
      expect(mix(md)).toMatchInlineSnapshot(
        '"<Callout icon="📘" theme="info" type="info"><h3 id="note-">Note 😁😁</h3><p>body text</p></Callout>"',
      );
    });

    it('should not render emojis in an image title (raw attribute, not parsed)', () => {
      const md =
        '[block:image]{"images":[{"image":["https://example.com/img.png","title :grin::grin:","alt text"]}]}[/block]';
      expect(mix(md)).toMatchInlineSnapshot('"<img src="https://example.com/img.png" alt="alt text" title="title :grin::grin:">"');
    });

    it('should render consecutive emojis in an image caption', () => {
      const md =
        '[block:image]{"images":[{"image":["https://example.com/img.png","","alt text"],"caption":"caption :grin::grin:"}]}[/block]';
      expect(mix(md)).toMatchInlineSnapshot('"<figure><img src="https://example.com/img.png" alt="alt text" title=""><figcaption><p>caption 😁😁</p></figcaption></figure>"');
    });

    it('should render consecutive emojis in an api-header title', () => {
      const md = '[block:api-header]{"title":"API :grin::grin:"}[/block]';
      expect(mix(md)).toMatchInlineSnapshot('"<h2 id="api-"><p>API 😁😁</p></h2>"');
    });

    it('should not render emojis in a code magic block', () => {
      const md = '[block:code]{"codes":[{"code":":grin::grin:","language":"text"}]}[/block]';
      expect(mix(md)).toMatchInlineSnapshot(`
        "<CodeTabs><pre><code class="language-text" lang="text" value=":grin::grin:">:grin::grin:
        </code></pre></CodeTabs>"
      `);
    });
  });

  describe('blockquote callouts', () => {
    it('should render consecutive emojis inside a blockquote callout', () => {
      const md = `> ❗️ UhOh :grin::grin: emoji
>
> Lorem ipsum dolor sit amet consectetur adipisicing elit.`;
      expect(mix(md)).toMatchInlineSnapshot(
        '"<Callout icon="❗️" theme="error"><h3 id="uhoh--emoji">UhOh 😁😁 emoji</h3><p>Lorem ipsum dolor sit amet consectetur adipisicing elit.</p></Callout>"',
      );
    });

    it('should render consecutive emojis in callout body', () => {
      const md = `> 📘 Title
>
> Body text :grin::grin: here`;
      expect(mix(md)).toMatchInlineSnapshot(
        '"<Callout icon="📘" theme="info"><h3 id="title">Title</h3><p>Body text 😁😁 here</p></Callout>"',
      );
    });

    it('should render consecutive emojis in callout with bold title', () => {
      const md = `> ⚠️ **Warning :grin::grin:**
>
> Be careful`;
      expect(mix(md)).toMatchInlineSnapshot(
        '"<Callout icon="⚠️" theme="warn"><h3 id="warning-"><strong>Warning 😁😁</strong></h3><p>Be careful</p></Callout>"',
      );
    });
  });

  describe('mixed contexts', () => {
    it('should render emojis with legacy variables', () => {
      expect(mix(':grin::grin: <<name>>')).toMatchInlineSnapshot(
        '"<p>😁😁 <variable name="name" isLegacy></variable></p>"',
      );
    });

    it('should render emojis inside bold text within a list', () => {
      expect(mix('- **bold :grin::grin:**')).toMatchInlineSnapshot(`
        "<ul>
        <li><strong>bold 😁😁</strong></li>
        </ul>"
      `);
    });

    it('should render emojis in a link inside a heading', () => {
      expect(mix('# [Link :grin::grin:](https://example.com)')).toMatchInlineSnapshot(
        '"<h1 id="link-"><a href="https://example.com">Link 😁😁</a></h1>"',
      );
    });

    it('should render emojis in a blockquote with bold and italic', () => {
      expect(mix('> **_:grin::grin: styled_**')).toMatchInlineSnapshot(`
        "<blockquote>
        <p><strong><em>😁😁 styled</em></strong></p>
        </blockquote>"
      `);
    });

    it('should render emojis alongside HTML elements', () => {
      expect(mix('<strong>bold</strong> :grin::grin:')).toMatchInlineSnapshot('"<p><strong>bold</strong> 😁😁</p>"');
    });
  });
});
