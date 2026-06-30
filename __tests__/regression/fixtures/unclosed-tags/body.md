# Unclosed and orphan tags

<Blob>

> 📘 Success callout
>
> The blockquote after an unclosed `<Blob>` opener should still render
> as a callout (not be swallowed as plain text).

<Table>
  <tr>
    <td>orphan void closer: </br>then more text</td>
  </tr>
</Table>

<pre>
preserved   whitespace
on multiple lines
</pre>

Trailing paragraph anchors the tree.
