import { extractScripts } from '../../components/HTMLBlock/extractScripts';

describe('extractScripts', () => {
  it('leaves text that is not a script', () => {
    expect(extractScripts('<script-example>keep</script-example><scripting>also</scripting>')).toStrictEqual({
      html: '<script-example>keep</script-example><scripting>also</scripting>',
      scripts: [],
    });
  });

  it('does not treat </script-example> as a closing script tag', () => {
    expect(extractScripts('<script>const marker = "</script-example>"; mockFn();</script><p>after</p>')).toStrictEqual({
      html: '<p>after</p>',
      scripts: ['const marker = "</script-example>"; mockFn();'],
    });
  });

  it('ends a script at </script> even when that text sits in a JS string', () => {
    expect(extractScripts('<script>const marker = "</script>"; mockFn();</script><p>after</p>')).toStrictEqual({
      html: '"; mockFn();</script><p>after</p>',
      scripts: ['const marker = "'],
    });
  });

  it('strips an opener assembled by a cut without executing the revealed body', () => {
    expect(extractScripts('<script<script></script>>alert(1)</script>')).toStrictEqual({
      html: '',
      scripts: [''],
    });
  });

  it('removes a script whose closer swallows a nested script before the tag ends', () => {
    expect(extractScripts('<script>alert(1)</script<script></script> >')).toStrictEqual({
      html: ' >',
      scripts: ['alert(1)</script<script>'],
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

  it('strips a script assembled by a nested script without executing the revealed body', () => {
    expect(extractScripts('<scrip<script></script>t>mockFn()</s<script></script>cript>')).toStrictEqual({
      html: '',
      scripts: ['', ''],
    });
  });

  it('runs first-pass scripts in order and does not run a tag the cut assembles', () => {
    const html = `<scr<script>log('X')</script>ipt>log('A')</script><script>log('B')</script>`;
    expect(extractScripts(html)).toStrictEqual({
      html: '',
      scripts: ["log('X')", "log('B')"],
    });
  });

  it('removes every complete script in a pass before assembling tags across the gaps', () => {
    const inner = '<script>R</script>';
    const html = `<scrip<${inner}script></script>t>mockFn()</s<${inner}script></script>cript>`;
    expect(extractScripts(html)).toStrictEqual({
      html: '',
      scripts: ['R', 'R'],
    });
  });

  it('peels a chain of tags that each appear only after the previous script is removed', () => {
    const html = `${'<scrip'.repeat(40)}<script></script>${'t></script>'.repeat(40)}<p>keep</p>`;
    expect(extractScripts(html)).toStrictEqual({
      html: '<p>keep</p>',
      scripts: [''],
    });
  });
});
