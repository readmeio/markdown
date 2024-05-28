import { mdast } from '../../index';

describe('callouts transformer', () => {
  it('can parse callouts', () => {
    const md = `
> 🚧 It works!
>
> And, it no longer deletes your content!
`;
    const tree = mdast(md);

    expect(tree.children[0].type).toBe('rdme-callout');
    expect(tree.children[0].children[0].type).toBe('paragraph');
    expect(tree.children[0].children[0].children[0].value).toBe('It works!');
  });

  it('can parse callouts with markdown in the heading', () => {
    const md = `
> 🚧 It **works!**
>
> And, it no longer deletes your content!
`;
    const tree = mdast(md);

    expect(tree.children[0].children[0].children[1].type).toBe('strong');
  });
});
