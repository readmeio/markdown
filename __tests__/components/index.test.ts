import { cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { execute } from '../helpers';

describe('Components', () => {
  it('Callout', async () => {
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
    ];

    let md = callout[0];
    let component = await execute(md);
    let { container } = render(React.createElement(component));

    expect(container.innerHTML).toMatchSnapshot();

    cleanup();

    md = callout[1];
    component = await execute(md);
    ({ container } = render(React.createElement(component)));

    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<blockquote class="callout callout_warn" theme="🚧"><h3 class="callout-heading empty"><span class="callout-icon">🚧</span></h3><p>Callout with no title.</p></blockquote>"`,
    );

    cleanup();
  });

  it('Embed', () => {
    const fixtures = {
      html: `<Embed
        html='<iframe class="embedly-embed" src="//cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fwww.google.com%2Fmaps%2Fembed%2Fv1%2Fplace%3Fcenter%3D37.829698%252C-122.258166%26key%3DAIzaSyD9HrlRuI1Ani0-MTZ7pvzxwxi4pgW0BCY%26zoom%3D16%26q%3D4126%2BOpal%2BSt%2C%2BOakland%2C%2BCA%2B94609&display_name=Google+Maps&url=https%3A%2F%2Fwww.google.com%2Fmaps%2Fplace%2F4126%2BOpal%2BSt%2C%2BOakland%2C%2BCA%2B94609%2F%4037.829698%2C-122.258166%2C16z%2Fdata%3D%214m5%213m4%211s0x80857dfb145a04ff%3A0x96b17d967421636f%218m2%213d37.8296978%214d-122.2581661%3Fhl%3Den&image=http%3A%2F%2Fmaps-api-ssl.google.com%2Fmaps%2Fapi%2Fstaticmap%3Fcenter%3D37.829698%2C-122.258166%26zoom%3D15%26size%3D250x250%26sensor%3Dfalse&key=02466f963b9b4bb8845a05b53d3235d7&type=text%2Fhtml&schema=google" width="600" height="450" scrolling="no" title="Google Maps embed" frameborder="0" allow="autoplay; fullscreen" allowfullscreen="true"></iframe>'
        url="https://www.google.com/maps/place/4126+Opal+St,+Oakland,+CA+94609/@37.829698,-122.258166,16z/data=!4m5!3m4!1s0x80857dfb145a04ff:0x96b17d967421636f!8m2!3d37.8296978!4d-122.2581661?hl=en"
        title="4126 Opal St, Oakland, CA 94609"
        favicon="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico"
        image="http://maps-api-ssl.google.com/maps/api/staticmap?center=37.829698,-122.258166&zoom=15&size=250x250&sensor=false"
      />`,
      iframe: `<Embed
        html={false}
        url="https://consent-manager.metomic.io/placeholder-demo.html?example=reddit"
        title={null}
        favicon={null}
        iframe={true}
        height="550"
      />`,
      meta: `<Embed
        html={false}
        url="https://www.nytimes.com/2020/05/03/us/politics/george-w-bush-coronavirus-unity.html"
        title="George W. Bush Calls for End to Pandemic Partisanship"
        favicon="https://www.nytimes.com/vi-assets/static-assets/favicon-4bf96cb6a1093748bf5b3c429accb9b4.ico"
        image="https://static01.nyt.com/images/2020/05/02/world/02dc-virus-bush-2/merlin_171999921_e857a690-fb9b-462d-a20c-28c8161107c9-facebookJumbo.jpg"
      />`,
      rdmd: '[rdmd](https://www.nytimes.com/2020/05/03/us/politics/george-w-bush-coronavirus-unity.html "@embed")',
    };

    Object.values(fixtures).map(async fx => {
      const component = await execute(fx);
      const { container } = render(React.createElement(component));
      return expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it('Image', async () => {
    const text =
      '![Bro eats pizza and makes an OK gesture.](https://files.readme.io/6f52e22-man-eating-pizza-and-making-an-ok-gesture.jpg "Pizza Face")';

    const component = await execute(text);
    const { container } = render(React.createElement(component));

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
});
