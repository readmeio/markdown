/* eslint-disable quotes */
import { mdast, mix } from '../../../index';

// @ts-expect-error - these are being imported as strings
import mdxishMd from './demo-docs/mdxish.md?raw';
// @ts-expect-error - these are being imported as strings
import rdmdMd from './demo-docs/rdmd.md?raw';
// @ts-expect-error - these are being imported as strings
import rmdxMd from './demo-docs/rmdx.md?raw';

describe('mix function', () => {
  describe('MDX-ish engine (loose MDX-like syntax)', () => {
    it.skip('should parse and compile the full MDX-ish document', () => {
      const ast = mdast(mdxishMd);
      const result = mix(ast);
      expect(result).toBeDefined();
      expect(result).toMatchSnapshot();
    });

    it.skip('should handle mixed HTML content', () => {
      const md = `<div style='background-color: #f0f0f0; padding: 20px; border-radius: 8px;'>
  <h3>This is an HTML Section</h3>
  <p>You can mix <strong>HTML</strong> directly into your markdown content.</p>
  <span style={{color:'orange'}}>This is an orange span element!</span>
</div>

Regular markdown continues after HTML elements without any issues.You can even write loose html, so unclosed tags like \`<hr>\` or \`<br>\` will work!

<hr>

HTML comment blocks should also work without issue. <!-- this should not be visible -->`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle custom components', () => {
      const md = `<MyRandomComponent title='My Accordion Title' icon='fa-info-circle' iconColor='blue'>

Lorem ipsum dolor sit amet, **consectetur adipiscing elit.** Ut enim ad minim veniam, quis nostrud exercitation ullamco. Excepteur sint occaecat cupidatat non proident!

</MyRandomComponent>`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle built-in components like Postman', () => {
      const md = `<Postman 
  collectionId='123456-abcd-efgh-ijkl' 
  collectionUrl='entityId=123456-abcd-efgh-ijkl&entityType=collection&workspaceId=abcdef-1234-5678'
  visibility='public'
  action='collection/fork'
/>`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle component composition (nested components)', () => {
      const md = `<Card title='Composed Components'>

<Accordion title='Click to expand!' icon='fa-magic' iconColor='purple'>
This Accordion is nested inside a Card component!
</Accordion>

</Card>`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle mixed attribute syntax (JSX style and HTML style)', () => {
      const md = `<div style={{backgroundColor: 'cyan'}}>

You can use a JSX-style CSS object to set inline styles.

</div>

<div style='background: yellow;'>

Or use the standard HTML \`[style]\` attribute.

</div>

<div className='attr-jsx-className'>

Using the \`className\` attribute.

</div>

<div class={'attr-html-class'}>

Or just the regular HTML \`class\` attribute

</div>`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle limited top-level JSX expressions', () => {
      const md = `- Logic: **\`{3 * 7 + 11}\`** evaluates to {3 * 7 + 11}
- Global Methods: **\`{uppercase('hello world')}\`** evaluates to {uppercase('hello world')}
- User Variables: **\`{user.name}\`** evaluates to {user.name}
- Comments: **\`{/* JSX-style comments */}\`** should not render {/* this should not be rendered */}`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle mixed MD & JSX syntax', () => {
      const md = `- Inline decorators should work with top-level JSX expressions. For example:

  > **{count}** items at _\${price}_ is [\${Math.round(multiply(count, price))}](https://google.com).

- Attributes can be given as plain HTML or as a JSX expression, so \`<a href='url'>\` and \`<a href={'url'}>\` should both work:
  
  > an <a href='https://example.com'>plain HTML attr</a> versus a <a href={'https://example.com'}>JSX expression</a>`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should preserve expressions in code blocks (not execute them)', () => {
      const md = `\`\`\`javascript
const result = {1 + 1};
const user = {userName};
const math = {5 * 10};
\`\`\`

Inline code also shouldn't evaluate: \`{1 + 1}\` should stay as-is in inline code.`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });
  });

  describe('RDMD engine (legacy markdown)', () => {
    it.skip('should parse and compile the full RDMD document', () => {
      const ast = mdast(rdmdMd);
      const result = mix(ast);
      expect(result).toBeDefined();
      expect(result).toMatchSnapshot();
    });

    it.skip('should handle reusable content', () => {
      const md = `<ContentBlock />`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle code blocks with titles', () => {
      const md = `\`\`\`php Sample Code
<? echo 'This should render a single codeblock with a title!'; ?>
\`\`\``;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle code tabs (successive code blocks)', () => {
      const md = `\`\`\`js Tab One
console.log('Code Tab A');
\`\`\`
\`\`\`python Tab Two
print('Code Tab B')
\`\`\``;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle callouts with emoji themes', () => {
      const md = `> ✅ Callout Title
>
> This should render a success callout.`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle title-only callouts', () => {
      const md = `> ℹ️ Callouts don't need to have body text.`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle callouts without title', () => {
      const md = `> ⚠️ 
> This callout has a title but no body text.`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle regular blockquotes with bold emoji (not callouts)', () => {
      const md = `> **❗️** This should render a regular blockquote, not a callout.`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle embeds with @embed syntax', () => {
      const md = `[Embed Title](https://youtu.be/8bh238ekw3 '@embed')`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle legacy user variables with <<name>> syntax', () => {
      const md = `> Hi, my name is **<<name>>**!`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle legacy glossary terms with <<glossary:term>> syntax', () => {
      const md = `> The term <<glossary:exogenous>> should show a tooltip on hover.`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle emoji shortcodes', () => {
      const md = `GitHub‑style emoji short codes like \`:sparkles:\` or \`:owlbert-reading:\` are expanded to their corresponding emoji or custom image.`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle compact headings (no space after hash)', () => {
      const md = `###Valid Header`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle ATX style headings (hashes on both sides)', () => {
      const md = `## Valid Header ##`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });
  });

  describe('RMDX engine (refactored MDX)', () => {
    it.skip('should parse and compile the full RMDX document', () => {
      const ast = mdast(rmdxMd);
      const result = mix(ast);
      expect(result).toBeDefined();
      expect(result).toMatchSnapshot();
    });

    it.skip('should handle custom components with props', () => {
      const md = `<MyDemoComponent message='Hello from MDX!'>Hello world!</MyDemoComponent>`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle reusable content', () => {
      const md = `<ContentBlock />`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle code blocks with titles', () => {
      const md = `\`\`\`php Sample Code
<? echo 'This should render a single codeblock with a title!'; ?>
\`\`\``;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle code tabs', () => {
      const md = `\`\`\`js Tab One
console.log('Code Tab A');
\`\`\`
\`\`\`python Tab Two
print('Code Tab B')
\`\`\``;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle callouts with emoji themes', () => {
      const md = `> ✅ Callout Title
>
> This should render a success callout.`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle Callout component with icon and theme props', () => {
      const md = `<Callout icon='🥇' theme='default'>
### Callout Component

A default callout using the MDX component.
</Callout>`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle regular blockquotes with bold emoji (not callouts)', () => {
      const md = `> **❗️** This should render a regular blockquote, not an error callout.`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle embeds with @embed syntax', () => {
      const md = `[Embed Title](https://youtu.be/8bh238ekw3 '@embed')`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle Embed component with props', () => {
      const md = `<Embed
  html={false}
  url='https://github.com/readmeio/api-explorer/pull/671'
  title='RDMD CSS theming and style adjustments. by rafegoldberg · Pull Request #671 · readmeio/api-explorer'
  favicon='https://github.com/favicon.ico'
  image='https://avatars2.githubusercontent.com/u/6878153?s=400&v=4'
/>`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle user variables with {user.name} syntax', () => {
      const md = `> Hi, my name is **{user.name}**!`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle Glossary component', () => {
      const md = `> The term <Glossary>exogenous</Glossary> should show a tooltip on hover.`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle emoji shortcodes', () => {
      const md = `GitHub‑style emoji short codes like \`:sparkles:\` or \`:owlbert-reading:\` are expanded to their corresponding emoji or custom image.`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle top-level JSX expressions', () => {
      const md = `- top-level logic can be written as JSX **\`{3 * 7 + 11}\`** expressions and should evaluate inline (to {3 * 7 + 11} in this case.)
- global JS methods are supported, such as **\`{uppercase('hello world')}\`** (which should evaluate to {uppercase('hello world')}.)`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle JSX comments', () => {
      const md = `- JSX comments like **\`{/* JSX-style comments */}\`** should work (while HTML comments like \`<!-- HTML-style comments -->\` will throw an error.)`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle compact headings (no space after hash)', () => {
      const md = `###Valid Header`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });

    it.skip('should handle ATX style headings (hashes on both sides)', () => {
      const md = `## Valid Header ##`;

      const ast = mdast(md);
      const result = mix(ast);
      expect(result).toBeDefined();
    });
  });
});
