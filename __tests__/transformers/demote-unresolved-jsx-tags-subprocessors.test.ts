import type { CustomComponents } from '../../types';

import { describe, expect, it } from 'vitest';

import { mix } from '../../lib';

const Registered = {} as CustomComponents[string];

describe('demoteUnresolvedJsxTags — bug repros at scale', () => {
  it('preserves the original CX-3284 input', () => {
    const html = mix('<Batch_id>_<File_Type>_<Version>.csv\n');
    expect(html).toContain('Version');
    expect(html).toContain('.csv');
  });

  it('preserves text after a bare unresolved opener at end of line', () => {
    const html = mix('Hello\n<Custom>\n');
    expect(html).toContain('Hello');
    expect(html).toContain('Custom');
  });

  it('preserves text after multiple unresolved openers in sequence', () => {
    const html = mix('<Alpha>\n<Beta>\n<Gamma>\nfinal text\n');
    expect(html).toContain('final text');
  });

  it('preserves heading content following an unresolved tag', () => {
    const html = mix('# <Version> heading text\n');
    expect(html).toContain('heading text');
  });

  it('preserves list item content following an unresolved tag', () => {
    const html = mix('- <Foo> item one\n- another item\n');
    expect(html).toContain('item one');
    expect(html).toContain('another item');
  });

  it('preserves blockquote content following an unresolved tag', () => {
    const html = mix('> <Bar> quoted\n');
    expect(html).toContain('quoted');
  });

  it('preserves a paragraph after a paragraph containing only an unresolved tag', () => {
    const html = mix('<Solo>\n\nNext paragraph here.\n');
    expect(html).toContain('Next paragraph here.');
  });
});

describe('demoteUnresolvedJsxTags — must NOT demote', () => {
  it('leaves lowercase <br /> alone', () => {
    const html = mix('Line one<br />line two\n');
    expect(html).toContain('<br>');
  });

  it('leaves lowercase <div> alone', () => {
    const html = mix('<div>html content</div>\n');
    expect(html).toContain('<div>');
    expect(html).toContain('html content');
  });

  it('leaves lowercase <span> with attribute alone', () => {
    const html = mix('<span class="foo">text</span>\n');
    expect(html).toContain('<span');
    expect(html).toContain('text');
  });

  it('leaves UPPERCASE HTML elements (DIV/SPAN) alone — they are still standard HTML', () => {
    const htmlA = mix('<DIV>uppercase div</DIV>\n');
    expect(htmlA).toContain('uppercase div');
    const htmlB = mix('<SPAN>uppercase span</SPAN>\n');
    expect(htmlB).toContain('uppercase span');
  });

  it('leaves <hr /> alone', () => {
    const html = mix('text\n<hr />\nmore text\n');
    expect(html).toContain('<hr>');
  });

  it('preserves registered components without demotion', () => {
    const html = mix('<Registered>kept</Registered>\n', { components: { Registered } });
    expect(html).toContain('Registered');
    expect(html).toContain('kept');
  });

  it('preserves built-in Callout', () => {
    const html = mix('<Callout icon="📘">callout body</Callout>\n');
    expect(html).toContain('callout body');
  });

  it('does not touch tags inside fenced code blocks', () => {
    const html = mix('```\n<Version>\n```\n');
    expect(html).toContain('&#x3C;Version>');
  });

  it('does not touch tags inside inline code', () => {
    const html = mix('Use `<Version>` carefully.\n');
    expect(html).toContain('&#x3C;Version>');
    expect(html).toContain('carefully');
  });
});

describe('demoteUnresolvedJsxTags — tag form variations', () => {
  it('demotes self-closing unresolved tag <Foo />', () => {
    const html = mix('Before <Foo /> after\n');
    expect(html).toContain('Foo');
    expect(html).toContain('Before');
    expect(html).toContain('after');
  });

  it('demotes opening-only <Foo>', () => {
    const html = mix('Before <Foo> after\n');
    expect(html).toContain('Foo');
    expect(html).toContain('Before');
    expect(html).toContain('after');
  });

  it('demotes closing-only </Foo>', () => {
    const html = mix('text </Foo> more\n');
    expect(html).toContain('text');
    expect(html).toContain('more');
  });

  it('demotes paired <Foo>x</Foo>', () => {
    const html = mix('<Foo>middle</Foo>\n');
    expect(html).toContain('Foo');
    expect(html).toContain('middle');
  });

  it('demotes tag with attributes <Foo prop="x">', () => {
    const html = mix('Before <Foo prop="x"> after\n');
    expect(html).toContain('Before');
    expect(html).toContain('after');
  });

  it('demotes tag with multiple attributes', () => {
    const html = mix('Before <Foo a="1" b="2"> after\n');
    expect(html).toContain('Before');
    expect(html).toContain('after');
  });

  it('demotes single-letter PascalCase tag <X>', () => {
    const html = mix('Use <X> please\n');
    expect(html).toContain('Use');
    expect(html).toContain('please');
  });

  it('demotes PascalCase tag with digits <Version2>', () => {
    const html = mix('<Version2>.txt\n');
    expect(html).toContain('.txt');
  });
});

describe('demoteUnresolvedJsxTags — mixed and adjacency', () => {
  it('keeps registered components when adjacent to unresolved tags', () => {
    const html = mix(
      '<Registered>kept</Registered>\n<Unresolved> tail\n',
      { components: { Registered } },
    );
    expect(html).toContain('kept');
    expect(html).toContain('tail');
  });

  it('preserves text between two unresolved tags', () => {
    const html = mix('<Alpha> middle text <Beta> tail\n');
    expect(html).toContain('middle text');
    expect(html).toContain('tail');
  });

  it('handles unresolved tag with code adjacent', () => {
    const html = mix('See `inline code` and <Foo> after\n');
    expect(html).toContain('inline code');
    expect(html).toContain('after');
  });

  it('preserves Markdown link text adjacent to unresolved tag', () => {
    const html = mix('Visit [link text](https://example.com) <Foo> done\n');
    expect(html).toContain('link text');
    expect(html).toContain('done');
  });

  it('renders many scattered unresolved tags without dropping content', () => {
    const html = mix('a <One> b <Two> c <Three> d <Four> e <Five> f\n');
    expect(html).toContain('a ');
    expect(html).toContain(' b ');
    expect(html).toContain(' c ');
    expect(html).toContain(' d ');
    expect(html).toContain(' e ');
    expect(html).toContain(' f');
  });
});

describe('demoteUnresolvedJsxTags — does not break adjacent transformers', () => {
  it('frontmatter still parses with unresolved tag in body', () => {
    const md = '---\ntitle: Test\n---\n\n<Version> body\n';
    const html = mix(md);
    expect(html).toContain('body');
  });

  it('table cells render with unresolved tag inside', () => {
    const md = '| col1 | col2 |\n| --- | --- |\n| <Foo> | bar |\n';
    const html = mix(md);
    expect(html).toContain('bar');
    expect(html).toContain('col1');
  });

  it('emphasis and unresolved tag together', () => {
    const html = mix('*emphasis* and <Foo> more\n');
    expect(html).toContain('emphasis');
    expect(html).toContain('more');
  });

  it('strong and unresolved tag together', () => {
    const html = mix('**bold** and <Foo> more\n');
    expect(html).toContain('bold');
    expect(html).toContain('more');
  });

  it('does not interfere with HTML comments', () => {
    const html = mix('<!-- comment -->\nbody\n');
    expect(html).toContain('body');
  });
});

describe('demoteUnresolvedJsxTags — round-trip safety', () => {
  it('renders the same text content for repeated mixes', () => {
    const md = 'Path is <Batch_id>_<File_Type>_<Version>.csv today.\n';
    const html1 = mix(md);
    const html2 = mix(md);
    expect(html1).toEqual(html2);
  });

  it('does not throw on empty input', () => {
    expect(() => mix('')).not.toThrow();
  });

  it('does not throw on input with only whitespace', () => {
    expect(() => mix('   \n\n   ')).not.toThrow();
  });

  it('does not throw on input that is only an unresolved tag', () => {
    expect(() => mix('<Lonely>\n')).not.toThrow();
  });

  it('does not throw on deeply nested unresolved tags', () => {
    const md = '<A><B><C><D><E>x</E></D></C></B></A>\n';
    expect(() => mix(md)).not.toThrow();
  });

  it('handles a very long sequence of unresolved tags', () => {
    const md = `${Array.from({ length: 50 }, (_, i) => `<Tag${i}>`).join(' ')  } end\n`;
    const html = mix(md);
    expect(html).toContain('end');
  });
});

describe('demoteUnresolvedJsxTags — subprocessor contexts: tables', () => {
  it('GFM table cell with unresolved opener does not eat following cell', () => {
    const md = '| header1 | header2 |\n| --- | --- |\n| <Foo> | second |\n';
    const html = mix(md);
    expect(html).toContain('second');
    expect(html).toContain('header1');
    expect(html).toContain('header2');
  });

  it('GFM table cell with paired unresolved tag preserves contents and siblings', () => {
    const md = '| h1 | h2 |\n| --- | --- |\n| <Foo>cell text</Foo> | next |\n';
    const html = mix(md);
    expect(html).toContain('cell text');
    expect(html).toContain('next');
  });

  it('GFM table cell with unresolved self-closing tag preserves siblings', () => {
    const md = '| h1 | h2 |\n| --- | --- |\n| <Foo /> | survived |\n';
    const html = mix(md);
    expect(html).toContain('survived');
  });

  it('multi-row GFM table preserves all rows when a cell has an unresolved tag', () => {
    const md = [
      '| h1 | h2 |',
      '| --- | --- |',
      '| <Foo> | row1col2 |',
      '| row2col1 | <Bar> |',
      '| row3col1 | row3col2 |',
      '',
    ].join('\n');
    const html = mix(md);
    expect(html).toContain('row1col2');
    expect(html).toContain('row2col1');
    expect(html).toContain('row3col1');
    expect(html).toContain('row3col2');
  });

  it('JSX <Table> with unresolved cell content still renders other cells', () => {
    const md = [
      '<Table align={[null,null]}>',
      '  <thead>',
      '    <tr>',
      '      <th>h1</th>',
      '      <th>h2</th>',
      '    </tr>',
      '  </thead>',
      '  <tbody>',
      '    <tr>',
      '      <td>row containing <Foo></td>',
      '      <td>untouched cell</td>',
      '    </tr>',
      '  </tbody>',
      '</Table>',
      '',
    ].join('\n');
    const html = mix(md);
    expect(html).toContain('untouched cell');
    expect(html).toContain('h1');
    expect(html).toContain('h2');
  });

  it('table cell with mix of registered and unresolved tags', () => {
    const md = [
      '| h |',
      '| --- |',
      '| <Registered>kept</Registered> and <Unresolved> after |',
      '',
    ].join('\n');
    const html = mix(md, { components: { Registered } });
    expect(html).toContain('kept');
    expect(html).toContain('after');
  });
});

describe('demoteUnresolvedJsxTags — subprocessor contexts: callouts', () => {
  it('blockquote-style callout with unresolved opener does not lose body', () => {
    const md = '> 📘 Title\n>\n> body with <Foo> in it\n';
    const html = mix(md);
    expect(html).toContain('Title');
    expect(html).toContain('body with');
    expect(html).toContain('in it');
  });

  it('JSX <Callout> with unresolved tag in body keeps body text', () => {
    const md = '<Callout icon="📘">\n  Use <Foo> in the placeholder.\n</Callout>\n';
    const html = mix(md);
    expect(html).toContain('in the placeholder');
  });

  it('JSX <Callout> with paired unresolved tag inside keeps surrounding text', () => {
    const md = '<Callout icon="📘">\n  Before <Foo>middle</Foo> after\n</Callout>\n';
    const html = mix(md);
    expect(html).toContain('Before');
    expect(html).toContain('middle');
    expect(html).toContain('after');
  });

  it('nested callout content with unresolved tag survives', () => {
    const md = [
      '<Callout icon="🚧">',
      '',
      '> nested quote with <Bar> inside',
      '',
      '</Callout>',
      '',
    ].join('\n');
    const html = mix(md);
    expect(html).toContain('nested quote with');
    expect(html).toContain('inside');
  });
});

describe('demoteUnresolvedJsxTags — subprocessor contexts: code blocks', () => {
  it('fenced code block with language preserves PascalCase tags inside', () => {
    const md = '```jsx\n<Version>\nconst x = <Foo />\n```\n';
    const html = mix(md);
    expect(html).toContain('Version');
    expect(html).toContain('Foo');
  });

  it('fenced code block with title attribute preserves PascalCase tags inside', () => {
    const md = '```jsx title="example.jsx"\n<Component />\n```\n';
    const html = mix(md);
    expect(html).toContain('Component');
  });

  it('indented code block preserves PascalCase tags inside', () => {
    const md = '    <Indented>\n    plain\n';
    const html = mix(md);
    expect(html).toContain('Indented');
  });

  it('inline code spans preserve PascalCase tags', () => {
    const html = mix('Try `<Inline />` syntax.\n');
    expect(html).toContain('Inline');
    expect(html).toContain('syntax');
  });

  it('code block adjacent to demoted tag both render correctly', () => {
    const md = '<Foo>\n\n```\n<Bar>\n```\n\nText after\n';
    const html = mix(md);
    expect(html).toContain('Foo');
    expect(html).toContain('Bar');
    expect(html).toContain('Text after');
  });

  it('code tabs (multiple fenced blocks) preserve content with PascalCase tags', () => {
    const md = '```js\nconst a = <One />\n```\n```ts\nconst b = <Two />\n```\n';
    const html = mix(md);
    expect(html).toContain('One');
    expect(html).toContain('Two');
  });
});

describe('demoteUnresolvedJsxTags — subprocessor contexts: recipes / embeds / images', () => {
  it('built-in <Image /> with unresolved tag in caption keeps both rendering', () => {
    const md = '<Image src="x.png" alt="img" caption="caption with <Foo>" />\n\nbody after\n';
    const html = mix(md);
    expect(html).toContain('body after');
  });

  it('built-in <Embed /> next to unresolved tag survives', () => {
    const md = '<Embed url="https://example.com" title="ex" />\n\n<Custom>\n\nfinal\n';
    const html = mix(md);
    expect(html).toContain('final');
  });

  it('Recipe block followed by unresolved tag keeps both rendering', () => {
    const md = '<Recipe slug="r" title="recipe" />\n\n<Solo>\n\nlast paragraph\n';
    const html = mix(md);
    expect(html).toContain('last paragraph');
  });
});

describe('demoteUnresolvedJsxTags — magic blocks and HTML blocks', () => {
  it('magic image block survives with unresolved tag adjacent', () => {
    const md = '[block:image]\n{"images":[{"image":["x.png","alt"]}]}\n[/block]\n\n<Foo>\n\ntail\n';
    const html = mix(md);
    expect(html).toContain('tail');
  });

  it('magic callout block survives with unresolved tag adjacent', () => {
    const md = '[block:callout]\n{"type":"info","body":"hi"}\n[/block]\n\n<Foo> after\n';
    const html = mix(md);
    expect(html).toContain('after');
  });

  it('html-block (curly-braced) with unresolved tag adjacent', () => {
    const md = '[block:html]\n{"html":"<div>raw</div>"}\n[/block]\n\n<Foo>\n\ntail\n';
    const html = mix(md);
    expect(html).toContain('tail');
  });
});

describe('demoteUnresolvedJsxTags — list contexts', () => {
  it('ordered list items with unresolved tag preserve item text', () => {
    const md = '1. first <Foo> item\n2. second item\n3. third item\n';
    const html = mix(md);
    expect(html).toContain('first');
    expect(html).toContain('item');
    expect(html).toContain('second item');
    expect(html).toContain('third item');
  });

  it('task list items with unresolved tag', () => {
    const md = '- [ ] todo <Foo>\n- [x] done\n';
    const html = mix(md);
    expect(html).toContain('todo');
    expect(html).toContain('done');
  });

  it('nested lists with unresolved tag at deep level', () => {
    const md = '- outer\n  - inner <Foo>\n  - inner two\n- outer two\n';
    const html = mix(md);
    expect(html).toContain('outer');
    expect(html).toContain('inner two');
    expect(html).toContain('outer two');
  });
});

describe('demoteUnresolvedJsxTags — heading and link contexts', () => {
  it('h1 through h6 with unresolved tags', () => {
    for (let level = 1; level <= 6; level += 1) {
      const md = `${'#'.repeat(level)} <Foo> heading text\n`;
      const html = mix(md);
      expect(html).toContain('heading text');
    }
  });

  it('link with unresolved tag in label', () => {
    const md = '[label <Foo>](https://example.com) and after\n';
    const html = mix(md);
    expect(html).toContain('label');
    expect(html).toContain('after');
  });

  it('image with unresolved tag in alt text', () => {
    const md = '![alt <Foo> text](image.png) caption\n';
    const html = mix(md);
    expect(html).toContain('caption');
  });

  it('reference-style link with unresolved tag', () => {
    const md = '[ref][1] and <Foo> tail\n\n[1]: https://example.com\n';
    const html = mix(md);
    expect(html).toContain('tail');
  });
});

describe('demoteUnresolvedJsxTags — emphasis interactions', () => {
  it('unresolved tag inside emphasis', () => {
    const html = mix('*emph <Foo> text*\n');
    expect(html).toContain('emph');
    expect(html).toContain('text');
  });

  it('unresolved tag inside strong', () => {
    const html = mix('**bold <Foo> text**\n');
    expect(html).toContain('bold');
    expect(html).toContain('text');
  });

  it('unresolved tag with strikethrough', () => {
    const html = mix('~~strike <Foo> text~~\n');
    expect(html).toContain('strike');
    expect(html).toContain('text');
  });

  it('underscores in tag name + emphasis underscores nearby', () => {
    const md = '_emph_ then <Underscore_Tag> then *more*\n';
    const html = mix(md);
    expect(html).toContain('emph');
    expect(html).toContain('more');
  });
});

describe('demoteUnresolvedJsxTags — pathological inputs', () => {
  it('malformed tag with embedded angle bracket in attribute does not crash', () => {
    expect(() => mix('Try <Foo attr="a>b"> done\n')).not.toThrow();
  });

  it('tag with whitespace-only content', () => {
    const html = mix('<Foo>   </Foo>\n');
    expect(typeof html).toBe('string');
  });

  it('tag immediately followed by another tag', () => {
    const html = mix('<Foo><Bar><Baz>\nend\n');
    expect(html).toContain('end');
  });

  it('mismatched open/close tags', () => {
    expect(() => mix('<Foo></Bar>\n')).not.toThrow();
  });

  it('tag at very start of document', () => {
    const html = mix('<Foo> at start\n');
    expect(html).toContain('at start');
  });

  it('tag at very end of document', () => {
    const html = mix('end <Foo>\n');
    expect(html).toContain('end');
  });

  it('mixture of resolved and unresolved tags repeated 100 times', () => {
    const segments: string[] = [];
    for (let i = 0; i < 100; i += 1) {
      segments.push(`<Registered>kept${i}</Registered>`);
      segments.push(`<NotResolved${i}> filler${i}`);
    }
    const md = `${segments.join('\n\n')  }\n`;
    const html = mix(md, { components: { Registered } });
    expect(html).toContain('kept0');
    expect(html).toContain('kept99');
    expect(html).toContain('filler0');
    expect(html).toContain('filler99');
  });

  it('input with all newlines and tabs', () => {
    expect(() => mix('\n\t\n\t\t<Foo>\n\t\n')).not.toThrow();
  });

  it('tag with very long attribute string', () => {
    const long = 'x'.repeat(5000);
    expect(() => mix(`<Foo attr="${long}"> after\n`)).not.toThrow();
  });

  it('tag whose name is a single uppercase letter', () => {
    const html = mix('<X> after\n');
    expect(html).toContain('after');
  });

  it('tag inside a footnote reference does not break', () => {
    const md = 'text[^1] and <Foo>\n\n[^1]: footnote with <Bar> inside\n';
    expect(() => mix(md)).not.toThrow();
  });
});

describe('demoteUnresolvedJsxTags — known component name forms (must NOT demote)', () => {
  it('known component with PascalCase variation matches via getComponentName', () => {
    const html = mix('<Mycomponent>kept</Mycomponent>\n', {
      components: { MyComponent: Registered as CustomComponents[string] },
    });
    expect(html).toContain('kept');
  });

  it('case-insensitive match preserves component (lowercase typed)', () => {
    const html = mix('<mycomponent>kept</mycomponent>\n', {
      components: { MyComponent: Registered as CustomComponents[string] },
    });
    expect(html).toContain('kept');
  });

  it('snake_case_to_PascalCase conversion preserves user-defined component', () => {
    const html = mix('<my_component>kept</my_component>\n', {
      components: { MyComponent: Registered as CustomComponents[string] },
    });
    expect(html).toContain('kept');
  });
});

describe('demoteUnresolvedJsxTags — adjacent text adjacency in html nodes', () => {
  it('html node where tag has trailing text in same node — still demotes whole html node', () => {
    const html = mix('> <Bar> trailing inside blockquote\n');
    expect(html).toContain('trailing inside blockquote');
  });

  it('html node with unresolved tag followed by punctuation', () => {
    const html = mix('start <Foo>!\n');
    expect(html).toContain('start');
    expect(html).toContain('!');
  });

  it('html node with tag inside a complete paragraph mid-sentence', () => {
    const html = mix('Here is <Foo> in middle of sentence.\n');
    expect(html).toContain('Here is');
    expect(html).toContain('in middle of sentence');
  });
});

describe('demoteUnresolvedJsxTags — nested components', () => {
  it('unresolved inside registered Callout: text content rendered correctly', () => {
    const html = mix('<Callout icon="📘">\n  Use <Foo /> here\n</Callout>\n');
    expect(html).toContain('Use');
    expect(html).toContain('here');
  });

  it('unresolved inside unresolved: full source preserved as text', () => {
    const html = mix('<Outer><Inner>nested content</Inner></Outer>\nafter\n');
    expect(html).toContain('after');
    expect(html).toContain('Outer');
    expect(html).toContain('Inner');
    expect(html).toContain('nested content');
  });

  it('triple-nested unresolved tags survive without dropping siblings', () => {
    const html = mix('<A><B><C>x</C></B></A>\nafter\n');
    expect(html).toContain('after');
  });

  it('registered nested inside unresolved (outer wins as literal text)', () => {
    const html = mix(
      '<Unknown>\n  <Callout icon="📘">inner callout</Callout>\n</Unknown>\nafter\n',
      { components: { Unknown: Registered as CustomComponents[string] } },
    );
    expect(html).toContain('after');
  });

  it('mixed registered & unresolved siblings inside a registered parent', () => {
    const html = mix(
      '<Callout icon="📘">\n  <Foo /> followed by text and <Bar />\n</Callout>\nlast line\n',
    );
    expect(html).toContain('followed by text and');
    expect(html).toContain('last line');
  });

  it('deeply nested through callout + list + unresolved tags', () => {
    const md = [
      '<Callout icon="📘">',
      '',
      '- item one with <Foo>',
      '- item two with <Bar />',
      '- item three',
      '',
      '</Callout>',
      'tail',
    ].join('\n');
    const html = mix(md);
    expect(html).toContain('item one with');
    expect(html).toContain('item three');
    expect(html).toContain('tail');
  });

  it('unresolved tag inside table cell inside callout', () => {
    const md = [
      '<Callout icon="📘">',
      '',
      '| h1 | h2 |',
      '| --- | --- |',
      '| <Foo> | survived |',
      '',
      '</Callout>',
      'after',
    ].join('\n');
    const html = mix(md);
    expect(html).toContain('survived');
    expect(html).toContain('after');
  });
});

describe('demoteUnresolvedJsxTags — runtime/special components must NOT demote', () => {
  it('preserves <Variable variable="name" /> (runtime component)', () => {
    const html = mix('<Variable variable="name" />\n');
    expect(JSON.stringify(html)).toContain('Variable');
  });
});
