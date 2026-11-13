<li> test
[block:parameters]
{
  "data": {
    "h-0": "Heading",
    "0-0": "Content"
  },
  "cols": 1,
  "rows": 1,
  "align": [
    "left",
    "left"
  ]
}
[/block]

<div class="note"> intro text
## Heading under a div with text

<li> closed later
[block:callout]
{
  "type": "info",
  "body": "Callout inside a closed li"
}
[/block]
</li>

<div>**bold**
more</div>

<li> First sibling, never closed
[block:callout]
{
  "type": "info",
  "body": "Callout under an implicitly closed li"
}
[/block]
<li> Second sibling</li>

<b> bold text
stays in the same paragraph</b>
