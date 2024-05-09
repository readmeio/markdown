---
title: 'HTML Blocks'
---

## JSX (with no HTML attributes)

<HTMLBlock runScripts={true}>
  <script>console.log(true, 0);</script>
  <h3>Header 0</h3>
  <p>Paragraph with <em>italics</em> and <strong>bold stuff</strong>.</p>
  <div>I am actually a div!</div>
</HTMLBlock>


## JSX

<HTMLBlock>
  <script>console.log(true, 1);</script>
  <h3>Header 1</h3>
  <p>Paragraph with <em>italics</em> and <strong>bold stuff</strong>.</p>
  <div style={{ paddingLeft: "20px", color: "blue" }}>
    Behold, I am blue and indented!
  </div>
</HTMLBlock>


## HTML as a prop

<HTMLBlock children='<script>console.log(true, 2);</script><h3>Header 2</h3>
  <p>Paragraph with <em>italics</em> and <strong>bold stuff</strong>.</p>
  <div style="padding-left: 20px; color: blue">Behold, I am blue and indented!</div>' />


## HTML in template literal

<HTMLBlock>
  {`
    <script>console.log(true, 3);</script>
    <h3>Header 3</h3>
    <p>Paragraph with <em>italics</em> and <strong>bold stuff</strong>.</p>
    <div style="padding-left: 20px; color: blue">
      Behold, I am blue and indented!
    </div>
  `}
</HTMLBlock>


## JSX in safe mode

<HTMLBlock safeMode={true}>
  <script>console.log(true, 4);</script>
  <h3>Header 4</h3>
  <p>Paragraph with <em>italics</em> and <strong>bold stuff</strong>.</p>
  <div style={{ paddingLeft: "20px", color: "blue" }}>
    Behold, I am blue and indented!
  </div>
</HTMLBlock>


## HTML in safe mode

<HTMLBlock safeMode={true}>
{`
  <script>console.log(true, 5);</script>
  <h3>Header 5</h3>
  <p>Paragraph with <em>italics</em> and <strong>bold stuff</strong>.</p>
  <div style="padding-left: 20px; color: blue">
    Behold, I am blue and indented!
  </div>
`}
</HTMLBlock>