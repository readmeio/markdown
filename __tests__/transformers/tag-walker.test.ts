import { walkTags } from '../../processor/transform/mdxish/tables/tag-walker';

// `+open@start-end` (`/` self-closing, `!` stray closer), `-close@start-end`, `~implicitClose@start`.
const events = (html: string) => {
  const out: string[] = [];
  walkTags(html, {
    onOpen: e => out.push(`+${e.name}@${e.start}-${e.end}${e.isSelfClosing ? '/' : ''}${e.isStrayCloser ? '!' : ''}`),
    onClose: e => out.push(e.implicit ? `~${e.name}@${e.start}` : `-${e.name}@${e.start}-${e.end}`),
  });
  return out.join(' ');
};

// Recorded from the htmlparser2 walker this replaced, so the switch to parse5 keeps its events (RM-19232).
describe('walkTags matches the htmlparser2 walker on edge cases', () => {
  it.each([
    ['<td>a<td>b</td>', '+td@0-4 ~td@5 +td@5-9 -td@10-15'],
    ['<tr><th>a<td>b</tr>', '+tr@0-4 +th@4-8 ~th@9 +td@9-13 ~td@14 -tr@14-19'],
    ['<tr><td>a<th>b</tr>', '+tr@0-4 +td@4-8 +th@9-13 ~th@14 ~td@14 -tr@14-19'],
    [
      '<thead><tr><th>a</th></tr><tbody><tr><td>b</td></tr></tbody>',
      '+thead@0-7 +tr@7-11 +th@11-15 -th@16-21 -tr@21-26 ~thead@26 +tbody@26-33 +tr@33-37 +td@37-41 -td@42-47 -tr@47-52 -tbody@52-60',
    ],
    ['<ul><li>a<li>b</ul>', '+ul@0-4 +li@4-8 ~li@9 +li@9-13 ~li@14 -ul@14-19'],
    ['<p>a<div>b</div>', '+p@0-3 ~p@4 +div@4-9 -div@10-16'],
    ['<h1>a<h2>b', '+h1@0-4 ~h1@5 +h2@5-9 ~h2@10'],
    ['<dl><dt>a<dd>b</dl>', '+dl@0-4 +dt@4-8 ~dt@9 +dd@9-13 ~dd@14 -dl@14-19'],
    ['<b>a<br>b<br/>c</br></b>', '+b@0-3 +br@4-8 ~br@4 +br@9-14/ ~br@9 +br@15-20! -br@15-20 -b@20-24'],
    ['x</p>y', '+p@1-5! -p@1-5'],
    ['<div/><Callout>x</Callout><Div>a</div>', '+div@0-6/ ~div@0 +Callout@6-15 -Callout@16-26 +Div@26-31 ~Div@38'],
    ['<script>a<b>c</script><style>a<b</style>', '+script@0-8 -script@13-22 +style@22-29 -style@32-40'],
    ['`<b>` <<var>> \\<i> <a title="</a>">x</a>', '+a@19-35 -a@36-40'],
    [
      '<table><tr><td><table><tr><td>x</td></tr></table></td></tr></table>',
      '+table@0-7 +tr@7-11 +td@11-15 +table@15-22 +tr@22-26 +td@26-30 -td@31-36 -tr@36-41 -table@41-49 -td@49-54 -tr@54-59 -table@59-67',
    ],
    ['<div><b>x', '+div@0-5 +b@5-8 ~b@9 ~div@9'],
    ['<td>a\r\n<td>😀b', '+td@0-4 ~td@7 +td@7-11 ~td@14'],
  ])('%j', (html, expected) => {
    expect(events(html)).toBe(expected);
  });
});
