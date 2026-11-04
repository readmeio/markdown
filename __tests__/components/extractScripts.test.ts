import { extractScripts } from '../../components/HTMLBlock/extractScripts';

describe('extractScripts', () => {
  it('leaves text that is not a script', () => {
    expect(extractScripts('<script-example>keep</script-example><scripting>also</scripting>')).toStrictEqual({
      html: '<script-example>keep</script-example><scripting>also</scripting>',
      scripts: [],
    });
  });

  it('does not end a script at a closing tag hidden in a string', () => {
    expect(extractScripts('<script>const marker = "</script-example>"; mockFn();</script><p>after</p>')).toStrictEqual({
      html: '<p>after</p>',
      scripts: ['const marker = "</script-example>"; mockFn();'],
    });
  });

  it('reads an end tag with trailing junk and keeps one following newline', () => {
    expect(extractScripts('<script>mockFn()</script\t\n bar>\nC')).toStrictEqual({
      html: 'C',
      scripts: ['mockFn()'],
    });
    expect(extractScripts('<script>a</script>\n\nC')).toStrictEqual({ html: '\nC', scripts: ['a'] });
  });

  it('ignores a vertical tab, which is not an HTML tag delimiter', () => {
    const html = '<script\v>no</script>';
    expect(extractScripts(html)).toStrictEqual({ html, scripts: [] });
  });

  it('removes adjacent scripts when the first one starts the string', () => {
    expect(extractScripts('<script></script><script>xR</script >/')).toStrictEqual({
      html: '/',
      scripts: ['', 'xR'],
    });
    expect(extractScripts('<script>a</script>keep<script>b</script>')).toStrictEqual({
      html: 'keep',
      scripts: ['a', 'b'],
    });
  });

  it('removes a script assembled by stripping a nested script, then the revealed one', () => {
    expect(extractScripts('<scrip<script></script>t>mockFn()</s<script></script>cript>')).toStrictEqual({
      html: '',
      scripts: ['', '', 'mockFn()'],
    });
  });

  it('removes every complete script in a pass before assembling tags across the gaps', () => {
    const inner = '<script>R</script>';
    const html = `<scrip<${inner}script></script>t>mockFn()</s<${inner}script></script>cript>`;
    expect(extractScripts(html)).toStrictEqual({
      html: '',
      scripts: ['R', 'R', '', '', 'mockFn()'],
    });
  });

  it('peels a chain of tags that each appear only after the previous script is removed', () => {
    const html = `${'<scrip'.repeat(40)}<script></script>${'t></script>'.repeat(40)}<p>keep</p>`;
    expect(extractScripts(html)).toStrictEqual({
      html: '<p>keep</p>',
      scripts: Array.from({ length: 41 }, () => ''),
    });
  });
});
