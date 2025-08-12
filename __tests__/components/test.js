/* eslint-disable no-eval */
const { cleanup, fireEvent, render } = require('@testing-library/react');
const React = require('react');

const markdown = require('../../index');
const { silenceConsole } = require('../helpers');

describe('Data Replacements', () => {
  it('Variables', () => {
    const { container } = render(
      React.createElement(
        markdown.utils.VariablesContext.Provider,
        {
          value: {
            defaults: [{ test: 'Default Value' }],
            user: { test: 'User Override' },
          },
        },
        markdown.react('<<test>>'),
      ),
    );
    expect(container).toContainHTML('<p><span>User Override</span></p>');
  });

  it('Glossary Term', () => {
    const { container } = render(
      React.createElement(
        markdown.utils.GlossaryContext.Provider,
        {
          value: [
            {
              term: 'term',
              definition: 'a word or phrase used to describe a thing or to express a concept.',
              _id: '1',
            },
          ],
        },
        markdown.react('<<glossary:term>>'),
      ),
    );
    expect(container).toContainHTML(
      '<p><span id="tooltip-trigger-mock-uuid-12345"><span class="GlossaryItem-trigger">term</span></span></p>',
    );
  });
});

describe('Components', () => {
  it('Callout', () => {
    const callout = [
      `

> ❗️ Error Callout
>
> Lorem ipsum dolor.

`,
      `

> 🚧
>
> Callout with no title.

`,
      `
[block:callout]
{
  "type": "warning",
  "body": "Callout with no title."
}
[/block]`,
    ];

    let { container } = render(markdown.react(callout[0]));
    expect(container.innerHTML).toMatchSnapshot();

    cleanup();

    const noTitleExpectation =
      '<blockquote class="callout callout_warn" theme="🚧"><h2 class="callout-heading empty"><span class="callout-icon">🚧</span></h2><p>Callout with no title.</p></blockquote>';

    ({ container } = render(markdown.react(callout[1])));
    expect(container).toContainHTML(noTitleExpectation);

    cleanup();

    ({ container } = render(markdown.react(callout[2])));
    expect(container).toContainHTML(noTitleExpectation);
  });

  it('Multi Code Block', () => {
    const tabs = '```\nhello\n```\n```php\nworld\n```\n\n';
    const rdmd = markdown.react(tabs);
    const { container } = render(rdmd);

    expect(container.querySelectorAll('pre')[1]).not.toHaveClass();

    fireEvent.click(container.querySelectorAll('.CodeTabs-toolbar button')[1]);

    expect(container.querySelectorAll('pre')[1]).toHaveClass('CodeTabs_active');
  });

  it('Embed', () => {
    const fixtures = {
      html: `[block:embed]
      {
        "html": "<iframe class=\\"embedly-embed\\" src=\\"//cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fwww.google.com%2Fmaps%2Fembed%2Fv1%2Fplace%3Fcenter%3D37.829698%252C-122.258166%26key%3DAIzaSyD9HrlRuI1Ani0-MTZ7pvzxwxi4pgW0BCY%26zoom%3D16%26q%3D4126%2BOpal%2BSt%2C%2BOakland%2C%2BCA%2B94609&display_name=Google+Maps&url=https%3A%2F%2Fwww.google.com%2Fmaps%2Fplace%2F4126%2BOpal%2BSt%2C%2BOakland%2C%2BCA%2B94609%2F%4037.829698%2C-122.258166%2C16z%2Fdata%3D%214m5%213m4%211s0x80857dfb145a04ff%3A0x96b17d967421636f%218m2%213d37.8296978%214d-122.2581661%3Fhl%3Den&image=http%3A%2F%2Fmaps-api-ssl.google.com%2Fmaps%2Fapi%2Fstaticmap%3Fcenter%3D37.829698%2C-122.258166%26zoom%3D15%26size%3D250x250%26sensor%3Dfalse&key=02466f963b9b4bb8845a05b53d3235d7&type=text%2Fhtml&schema=google\\" width=\\"600\\" height=\\"450\\" scrolling=\\"no\\" title=\\"Google Maps embed\\" frameborder=\\"0\\" allow=\\"autoplay; fullscreen\\" allowfullscreen=\\"true\\"></iframe>",
        "url": "https://www.google.com/maps/place/4126+Opal+St,+Oakland,+CA+94609/@37.829698,-122.258166,16z/data=!4m5!3m4!1s0x80857dfb145a04ff:0x96b17d967421636f!8m2!3d37.8296978!4d-122.2581661?hl=en",
        "title": "4126 Opal St, Oakland, CA 94609",
        "favicon": "https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico",
        "image": "http://maps-api-ssl.google.com/maps/api/staticmap?center=37.829698,-122.258166&zoom=15&size=250x250&sensor=false"
      }
      [/block]`,
      iframe: `[block:embed]
      {
        "html": false,
        "url": "https://consent-manager.metomic.io/placeholder-demo.html?example=reddit",
        "title": null,
        "favicon": null,
        "iframe": true,
        "height": "550"
      }
      [/block]`,
      meta: `[block:embed]
      {
        "html": false,
        "url": "https://www.nytimes.com/2020/05/03/us/politics/george-w-bush-coronavirus-unity.html",
        "title": "George W. Bush Calls for End to Pandemic Partisanship",
        "favicon": "https://www.nytimes.com/vi-assets/static-assets/favicon-4bf96cb6a1093748bf5b3c429accb9b4.ico",
        "image": "https://static01.nyt.com/images/2020/05/02/world/02dc-virus-bush-2/merlin_171999921_e857a690-fb9b-462d-a20c-28c8161107c9-facebookJumbo.jpg"
      }
      [/block]`,
      rdmd: '[](https://www.nytimes.com/2020/05/03/us/politics/george-w-bush-coronavirus-unity.html "@embed")',
    };

    silenceConsole()(error => {
      Object.values(fixtures).map(fx => {
        const { container } = render(markdown.react(fx));
        return expect(container.innerHTML).toMatchSnapshot();
      });

      expect(error).toHaveBeenCalledTimes(1);
    });
  });

  it('Image', () => {
    const text =
      '![Bro eats pizza and makes an OK gesture.](https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg "Pizza Face")';

    const { container } = render(markdown.react(text));
    expect(container.innerHTML).toMatchSnapshot();

    const img = container.querySelectorAll('img')[0];
    const box = container.querySelectorAll('.lightbox')[0];

    fireEvent.click(img);
    expect(box).toHaveClass('open');

    fireEvent.keyDown(img, { key: 'Enter' });
    expect(box).toHaveClass('open');

    fireEvent.keyDown(img, { key: 'Escape' });
    expect(box).not.toHaveClass('open');

    fireEvent.keyDown(img, { key: ' ' });
    expect(box).toHaveClass('open');

    fireEvent.keyDown(img, { key: '.', metaKey: true });
    expect(box).not.toHaveClass('open');
  });

  it('Heading', () => {
    let { container } = render(markdown.react('### Heading Level 3\n\n### Heading Level 3'));
    expect(container.querySelectorAll('.heading')).toHaveLength(2);

    cleanup();

    ({ container } = render(markdown.react('Pretest.\n\n###\n\nPosttest.')));
    expect(container.querySelector('.heading')).toHaveTextContent('');
  });

  it('Heading no children', () => {
    const { container } = render(markdown.react('### Heading Level 3'));
    expect(container.querySelectorAll('.heading')).toHaveLength(1);
  });
});

describe('Compatibility Mode', () => {
  global.eval = jest.fn();
  const tabs = `[block:api-header]
{
  "title": "I am a magical, mystical heading."
}
[/block]
<div id="custom-target">Loading...</div>
[block:html]
${JSON.stringify({
  html: '<script>\nconsole.log("World");\n</script>\n\n<b>Hello!</b>\n\n<script>\nconsole.log("World");\n</script>',
})}
[/block]

[block:parameters]
${JSON.stringify({
  data: {
    '0-0': "```js Tab Zed\nconsole.log('tab zed');\n```\n```js Tab One\nconsole.log('tab one')\n```",
    '0-1':
      '> Lorem ipsum dolor sit amet, consectetur adipisicing elit. Maxime repellat placeat expedita voluptatum fugiat rerum, accusamus eius dolorum sequi eveniet esse, adipisci soluta quia mollitia? Dolorem minus, dolores, rerum, pariatur sit quia eum esse voluptatibus ea veritatis non.',
    '0-2': '',
    'h-0': 'Hello',
    'h-1': 'Bonjour',
    'h-2': 'Willkommen',
  },
  cols: 2,
  rows: 1,
})}
[/block]`;

  let rdmd;
  let container;
  beforeEach(() => {
    rdmd = markdown.react(tabs, { compatibilityMode: true });
    ({ container } = render(rdmd));
  });

  it('Should use h1 tags for magic heading blocks.', () => expect(container.querySelectorAll('h1')).toHaveLength(1));

  it('Should allow block-level RDMD compoonents in tables.', () => {
    const table = container.querySelector('table');
    expect(table.querySelectorAll('.CodeTabs')).toHaveLength(1);
    expect(table.querySelectorAll('blockquote')).toHaveLength(1);
  });
});
