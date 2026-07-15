---
title: HTML Blocks
category:
  uri: uri-that-does-not-map-to-5fdf7610134322007389a6ed
privacy:
  view: public
---

## 1. Basic raw HTML

<HTMLBlock>{`<div>Hello from a raw HTMLBlock</div>`}</HTMLBlock>

## 2. Paragraphs with a blank line between them

<HTMLBlock>{`<div>
<p>First paragraph</p>

<p>Second paragraph after a blank line</p>
</div>
`}</HTMLBlock>

## 3. An HTML table

<HTMLBlock>{`<table>
<thead>
<tr><th>Name</th><th>Role</th></tr>
</thead>
<tbody>
<tr><td>Ada</td><td>Engineer</td></tr>
<tr><td>Grace</td><td>Admiral</td></tr>
</tbody>
</table>
`}</HTMLBlock>

## 4. A styled table with blank lines between rows

<HTMLBlock>{`<table style="width:100%; border-collapse:collapse;">
<thead>
<tr>
<th style="text-align:left; border-bottom:2px solid #333;">Feature</th>
<th style="text-align:left; border-bottom:2px solid #333;">Status</th>
</tr>
</thead>
<tbody>
<tr>
<td style="padding:8px;">Callouts</td>
<td style="padding:8px; color:green;">Supported</td>
</tr>

<tr>
<td style="padding:8px;">Nested tables</td>
<td style="padding:8px; color:orange;">Partial</td>
</tr>
</tbody>
</table>
`}</HTMLBlock>

## 5. Inline styles on a div

<HTMLBlock>{`<div style="color: red; font-weight: bold; padding: 12px; border: 1px solid #ccc;">
This whole block is styled inline.
</div>`}</HTMLBlock>

## 6. A scoped &lt;style&gt; block plus markup

<HTMLBlock>{`<style>
.callout-card {
  border-radius: 8px;
  padding: 16px;
  background: #f5f7ff;
  border-left: 4px solid #4353ff;
}
.callout-card h4 { margin: 0 0 8px; color: #1a2b8f; }
</style>
<div class="callout-card">
<h4>Heads up</h4>
<p>This card is styled by the &lt;style&gt; block above it.</p>
</div>
`}</HTMLBlock>

## 7. Content that *looks* like markdown but stays raw

<HTMLBlock>{`<div>
# This is not a heading
- this is not a list item
**this is not bold**
It is all literal text inside a raw div.
</div>
`}</HTMLBlock>

## 8. Definition list

<HTMLBlock>{`<dl>
<dt>MDXish</dt>
<dd>Lenient markdown + MDX subset processor.</dd>
<dt>RMDX</dt>
<dd>Strict MDX-first processor.</dd>
</dl>
`}</HTMLBlock>

## 9. Details / summary (native accordion)

<HTMLBlock>{`<details>
<summary>Click to expand</summary>
<p>Hidden content revealed on toggle.</p>
</details>
`}</HTMLBlock>

## 10. Nested layout — a two-column card grid

<HTMLBlock>{`<div style="display:flex; gap:16px;">
<div style="flex:1; padding:16px; background:#fafafa; border-radius:6px;">
<h3>Left column</h3>
<p>Some copy in the left card.</p>
</div>
<div style="flex:1; padding:16px; background:#fafafa; border-radius:6px;">
<h3>Right column</h3>
<p>Some copy in the right card.</p>
</div>
</div>
`}</HTMLBlock>

## 11. Preserving curly braces (not treated as a JSX expression)

<HTMLBlock>{`<div>Template placeholder: {notAnExpression} stays literal.</div>`}</HTMLBlock>

## 12. Inline code and entities

<HTMLBlock>{`<p>Run <code>npm install &amp;&amp; npm test</code> before &lt;committing&gt;.</p>`}</HTMLBlock>

## 13. safeMode attribute

<HTMLBlock safeMode={true}>{`<button onload="alert('blocked in safe mode')">Do not click</button>`}</HTMLBlock>

## 14. runScripts attribute

<HTMLBlock runScripts="true">{`<script>console.log('ran from an HTMLBlock');</script>
<div id="script-target">Script output lands here.</div>
`}</HTMLBlock>

## 15. Both attributes together

<HTMLBlock safeMode="false" runScripts="afterRender">{`<div>Rendered, then scripts run afterward.</div>`}</HTMLBlock>

## 16. An embedded iframe

<HTMLBlock>{`<iframe
  src="https://example.com/widget"
  width="100%"
  height="240"
  frameborder="0"
  title="Example widget">
</iframe>
`}</HTMLBlock>

## 17. SVG graphic

<HTMLBlock>{`<svg width="120" height="60" viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="60" rx="8" fill="#4353ff"/>
<text x="60" y="36" fill="#fff" font-size="16" text-anchor="middle">Badge</text>
</svg>
`}</HTMLBlock>

## 18. Multiple HTMLBlocks back to back

<HTMLBlock>{`<div class="row-a">Block A</div>`}</HTMLBlock>

<HTMLBlock>{`<div class="row-b">Block B</div>`}</HTMLBlock>

## 19. HTMLBlock inside a &lt;Table&gt; cell (the reverse nesting)

<Table>
  <thead>
    <tr><th>Markdown cell</th><th>HTMLBlock cell</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>**bold** still works here</td>
      <td><HTMLBlock>{`<div style="color: red;">
<p>Raw</p>

<p>HTML</p>
</div>
`}</HTMLBlock></td>
    </tr>
  </tbody>
</Table>
