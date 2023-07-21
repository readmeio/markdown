---
title: 'Variable Tests'
category: 5fdf9fc9c2a7ef443e937315
hidden: true
---

<<defvar>> and `<<defvar>>` and:

```
<<defvar>>
```

and

```js
const xyz = '<<defvar>>';
```

```
should \<< be escaped >>

should <<
not be a var >>

also not a <<variable\r>>
```
