---
title: "Code Blocks"
slug: "code-blocks"
hidden: false
createdAt: "2019-12-10T01:01:15.108Z"
updatedAt: "2020-04-25T02:07:05.267Z"
---
[block:api-header]
{
  "title": "Syntax"
}
[/block]
An extended syntax for displaying multiple code blocks in a tabbed interface. These are written nearly identically to a series of vanilla markdown code snippets, except for their distinct *lack* of an additional line break separating each subsequent block:

    ```javascript I'm A tab...
    console.log('Code Tab A');
    ```
    ```javascript And I'm B tab!
    console.log('Code Tab B');
    ```

<!--
### Highlighting

| Highlighting | Language Mode                 |
|:-------------|------------------------------:|
| C            |  `c` `c++` `cpp` `cplusplus`  |
| Docker       |  `dockerfile`                 |
| Go           |  `go`                         |
| HTML/XML     |  `html` `xml`                 |
| Javascript   |  `javascript` `js`            |
| PHP          |  `php`                        |
| Powershell   |  `powershell`                 |
| Python       |  `python` `py`                |
| Ruby         |  `ruby`                       |
| Shell        |  `shell` `bash` `sh`          |
| SQL          |  `sql` `mysql`                |
| Swift        |  `swift`                      |
-->
[block:api-header]
{
  "title": "Examples"
}
[/block]
### Tabbed Code Blocks

```javascript I'm A tab...
console.log('Code Tab A');
```
```javascript And I'm B tab!
console.log('Code Tab B');
```

### Single Code Block

```javascript
console.log('a code block');
```

<!--
## Custom CSS

```css Theme Variables
.markdown-body {
  --md-code-background: #080015;
  --md-code-text: white;
  --md-code-tabs: #4a2a7b;
  --md-code-radius: 5px;
}
```
-->