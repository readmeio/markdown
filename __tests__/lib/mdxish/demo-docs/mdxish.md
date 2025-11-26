# MDX-ish Engine (Proposed Loose MDX-Like Syntax)

A demo doc for the proposed loose "MDX-ish" syntax. Test against this doc (as well as the legacy RDMD and new RMDX docs) to validate that the engine can parse and render our new mixed content syntax.

## Mixed HTML Content

<div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
  <h3>This is an HTML Section</h3>
  <p>You can mix <strong>HTML</strong> directly into your markdown content.</p>
  <span style={{color:'orange'}}>This is an orange span element!</span>
</div>

Regular markdown continues after HTML elements without any issues.You can even write loose html, so unclosed tags like `<hr>` or `<br>` will work!

<hr>

HTML comment blocks should also work without issue. <!-- this should not be visible -->

## Custom Components

Custom components and reusable content should be fully supported:

<MyRandomComponent title="My Accordion Title" icon="fa-info-circle" iconColor="blue">

Lorem ipsum dolor sit amet, **consectetur adipiscing elit.** Ut enim ad minim veniam, quis nostrud exercitation ullamco. Excepteur sint occaecat cupidatat non proident!

</MyRandomComponent>

You should be able to use our built in components as if they were globals. Here's our "Run in Postman" button, for example:

<Postman 
  collectionId="123456-abcd-efgh-ijkl" 
  collectionUrl="entityId=123456-abcd-efgh-ijkl&entityType=collection&workspaceId=abcdef-1234-5678"
  visibility="public"
  action="collection/fork"
/>

### Component Composition

You can nest components inside each other! Here's an `<Accordion>` nested inside a `<Card>`, for example:

<Card title="Composed Components">

<Accordion title="Click to expand!" icon="fa-magic" iconColor="purple">
This Accordion is nested inside a Card component!
</Accordion>

</Card>

## Mixed Attribute Syntax

### Style

<div style={{backgroundColor: 'cyan'}}>

You can use a JSX-style CSS object to set inline styles.

</div>

<div style="background: yellow;">

Or use the standard HTML `[style]` attribute.

</div>

### Class

<div className="attr-jsx-className">

Using the `className` attribute.

</div>

<div class={"attr-html-class"}>

Or just the regular HTML `class` attribute

</div>

<style>
.attr-jsx-className,
.attr-jsx-className > :only-child {
  color: magenta !important;
  background: cyan;
}
.attr-html-class,
.attr-html-class > :only-child {
  color: cyan !important;
  background: magenta;
}
</style>

## Limited Top-Level JSX

- Logic: **`{3 * 7 + 11}`** evaluates to {3 * 7 + 11}
- Global Methods: **`{uppercase('hello world')}`** evaluates to {uppercase('hello world')}
- User Variables: **`{user.name}`** evaluates to {user.name}
- Comments: **`{/* JSX-style comments */}`** should not render {/* this should not be rendered */}

## Mixed MD & JSX Syntax

- Inline decorators should work with top-level JSX expressions. For example:

  > **{count}** items at _${price}_ is [${Math.round(multiply(count, price))}](https://google.com).

- Attributes can be given as plain HTML or as a JSX expression, so `<a href="url">` and `<a href={'url'}>` should both work:
  
  > an <a href="https://example.com">plain HTML attr</a> versus a <a href={'https://example.com'}>JSX expression</a>


### Code Blocks Should NOT Execute

Both inline code + code blocks should preserve expressions, instead of evaluating them:

```javascript
const result = {1 + 1};
const user = {userName};
const math = {5 * 10};
```

Inline code also shouldn't evaluate: `{1 + 1}` should stay as-is in inline code.
